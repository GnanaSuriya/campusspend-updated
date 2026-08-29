import os
import json
from google import genai
from google.genai import types
from datetime import datetime
from flask import Blueprint, jsonify
from utils.auth import require_auth
from utils.financials import get_budget_summary

insights_bp = Blueprint('insights', __name__)

@insights_bp.route('/insights', methods=['POST'])
@require_auth
def generate_insights(user_id):
    api_key = os.getenv('GEMINI_API_KEY')
    now = datetime.utcnow()
    
    # 1. Calculate deterministic financial statistics
    # This uses the single-source-of-truth from financials.py
    # which correctly handles shared expenses and limits by current month.
    summary_data = get_budget_summary(user_id, now.month, now.year)
    
    # 2. Prepare base response
    response_data = {
        "financials": summary_data,
        "ai": None,
        "ai_error": None
    }
    
    # If no spending, we skip the AI call
    if summary_data['total_spent'] == 0:
        return jsonify({"success": True, "data": response_data}), 200

    if not api_key:
        print("Missing GEMINI_API_KEY")
        response_data['ai_error'] = "Insights are temporarily unavailable (Missing API Key)."
        return jsonify({"success": True, "data": response_data}), 200

    # 3. Prompt Engineering
    prompt = f"""
You are the spending-insights assistant for CampusSpend.

The financial statistics provided to you have already been calculated and verified by the application backend.
DO NOT recalculate, modify, invent, or contradict any financial numbers.

Analyze the provided monthly spending statistics and produce concise, practical insights.
Identify:
1. The highest spending category.
2. Any category consuming an unusually large portion of spending.
3. Whether the user is approaching or exceeding their budget.
4. Practical ways to reduce unnecessary spending.
5. One or two useful observations about the spending pattern.

Do not invent transactions or amounts.

FINANCIAL DATA:
{json.dumps(summary_data, indent=2)}

Return strictly valid JSON matching this schema:
{{
  "summary": "You spent ₹X this month, which is Y% of your budget.",
  "insights": [
    {{
      "title": "Short title",
      "description": "Insight description referencing real numbers.",
      "type": "category"
    }}
  ],
  "suggestions": [
    "Suggestion 1",
    "Suggestion 2"
  ]
}}
"""

    # 4. Call Gemini
    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        content = response.text
        
        # Safely parse JSON in case Gemini returns markdown fences like ```json ... ```
        content = content.strip()
        if content.startswith('```json'):
            content = content[7:]
        if content.endswith('```'):
            content = content[:-3]
        
        try:
            output_json = json.loads(content.strip())
            response_data['ai'] = output_json
        except json.JSONDecodeError:
            response_data['ai'] = None
            response_data['ai_error'] = "AI insights are temporarily unavailable."
            
    except Exception as e:
        print("Gemini Exception:", str(e))
        response_data['ai_error'] = "AI insights are temporarily unavailable."

    # Return the unified data, even if AI failed, so frontend can display deterministic numbers
    return jsonify({"success": True, "data": response_data}), 200
