import os
import json
import urllib.request
from urllib.error import URLError, HTTPError
from datetime import datetime
from flask import Blueprint, jsonify
from utils.auth import require_auth
from utils.financials import get_budget_summary

insights_bp = Blueprint('insights', __name__)

@insights_bp.route('/insights', methods=['POST'])
@require_auth
def generate_insights(user_id):
    api_key = os.getenv('GEMINI_API_KEY') or os.getenv('AI_API_KEY')
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
    if summary_data.get('total_spent', 0) == 0:
        return jsonify({"success": True, "data": response_data}), 200

    if not api_key:
        print("Missing GEMINI_API_KEY")
        response_data['ai_error'] = "Insights are temporarily unavailable (Missing API Key)."
        return jsonify({"success": True, "data": response_data}), 200

    # 3. Compact Financial Data
    compact_data = {
        "total_spent": summary_data.get("total_spent", 0),
        "total_budget": summary_data.get("total_budget", 0),
        "remaining": summary_data.get("remaining", 0),
        "categories": summary_data.get("categories", [])
    }

    # 4. Prompt Engineering
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
{json.dumps(compact_data, indent=2)}

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

    # 5. Call Gemini via REST (No external SDKs required)
    try:
        clean_key = api_key.strip().strip('"\'')
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={clean_key}"
        headers = {
            "Content-Type": "application/json"
        }
        
        # Gemini specific JSON mode payload
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.4
            }
        }
        
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=headers, method='POST')
        
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                resp_body = response.read().decode('utf-8')
                gemini_resp = json.loads(resp_body)
                
                content = ""
                if "candidates" in gemini_resp and len(gemini_resp["candidates"]) > 0:
                    content = gemini_resp["candidates"][0]["content"]["parts"][0]["text"]
                
                # Safely parse JSON in case AI returns markdown fences
                content = content.strip()
                if content.startswith('```json'):
                    content = content[7:]
                if content.endswith('```'):
                    content = content[:-3]
                
                try:
                    output_json = json.loads(content.strip())
                    # Validate required fields
                    if "summary" in output_json and "insights" in output_json and "suggestions" in output_json:
                        response_data['ai'] = output_json
                    else:
                        response_data['ai_error'] = "AI insights are temporarily unavailable."
                except json.JSONDecodeError:
                    response_data['ai'] = None
                    response_data['ai_error'] = "AI response could not be parsed."
                    
        except HTTPError as e:
            err_body = e.read().decode('utf-8')
            print("Gemini API Error:", e.code)
            # Avoid leaking the API key in error messages
            safe_err = err_body.replace(clean_key, "[REDACTED]")
            try:
                err_json = json.loads(safe_err)
                msg = err_json.get("error", {}).get("message", safe_err)
                response_data['ai_error'] = f"AI Error {e.code}: {msg}"
            except:
                response_data['ai_error'] = f"AI Error {e.code}"
            
    except Exception as e:
        print("Gemini Exception:", type(e).__name__)
        response_data['ai_error'] = "AI response could not be parsed."

    # Return the unified data, even if AI failed, so frontend can display deterministic numbers
    return jsonify({"success": True, "data": response_data}), 200

