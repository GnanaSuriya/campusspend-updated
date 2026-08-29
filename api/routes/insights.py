import os
import json
import requests
from datetime import datetime
from flask import Blueprint, jsonify
from utils.auth import require_auth
from utils.financials import get_budget_summary

insights_bp = Blueprint('insights', __name__)

@insights_bp.route('/insights', methods=['POST'])
@require_auth
def generate_insights(user_id):
    api_key = os.getenv('GROQ_API_KEY')
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
        print("Missing GROQ_API_KEY")
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

    # 4. Call Groq
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": "You are a helpful JSON-only assistant."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.4
        }
        
        r = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=15)
        if r.status_code == 200:
            groq_resp = r.json()
            content = groq_resp['choices'][0]['message']['content']
            
            # Safely parse JSON in case Groq returns markdown fences like ```json ... ```
            content = content.strip()
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            
            output_json = json.loads(content.strip())
            response_data['ai'] = output_json
        else:
            print("Groq API Error:", r.status_code, r.text)
            try:
                err_json = r.json()
                msg = err_json.get("error", {}).get("message", r.text)
                response_data['ai_error'] = f"Groq Error {r.status_code}: {msg}"
            except:
                response_data['ai_error'] = f"Groq Error {r.status_code}: {r.text}"
            
    except Exception as e:
        print("Groq Exception:", str(e))
        response_data['ai_error'] = f"Exception: {str(e)}"

    # Return the unified data, even if AI failed, so frontend can display deterministic numbers
    return jsonify({"success": True, "data": response_data}), 200
