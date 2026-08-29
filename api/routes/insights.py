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
    api_key = os.getenv('OPENROUTER_API_KEY')
    now = datetime.utcnow()
    
    # 1. Calculate deterministic financial statistics (SINGLE SOURCE OF TRUTH)
    summary_data = get_budget_summary(user_id, now.month, now.year)
    
    # 2. Prepare base response
    response_data = {
        "financials": summary_data,
        "ai": None,
        "ai_error": None
    }
    
    # Skip AI if no spending
    if summary_data.get('total_spent', 0) == 0:
        return jsonify({"success": True, "data": response_data}), 200

    if not api_key:
        print("Missing OPENROUTER_API_KEY")
        response_data['ai_error'] = "Insights are temporarily unavailable (Missing API Key)."
        return jsonify({"success": True, "data": response_data}), 200

    # 3. Compact Financial Data
    compact_data = {
        "total_spent": summary_data.get("total_spent", 0),
        "total_budget": summary_data.get("total_budget", 0),
        "remaining": summary_data.get("remaining", 0),
        "percentage_used": summary_data.get("percentage_used", 0),
        "categories": summary_data.get("categories", [])
    }

    # 4. AI Prompting
    system_prompt = """You are the AI spending-insights assistant for CampusSpend.

The financial data provided by the application backend has already been calculated and verified.
You MUST NOT recalculate, alter, invent, or contradict any financial number.

Your job is only to explain the provided numbers and provide useful spending observations.
Identify:
1. Highest spending category.
2. Categories taking an unusually large percentage of spending.
3. Whether spending is approaching or exceeding the budget.
4. Useful spending patterns.
5. Practical ways to reduce unnecessary spending.

Never invent transactions.
Never invent categories.
Never invent amounts.

Return ONLY valid JSON matching this schema:
{
    "summary": "Short summary of the user's monthly spending.",
    "insights": [
        {
            "title": "Short title",
            "description": "Explanation based only on supplied financial data.",
            "type": "category"
        }
    ],
    "suggestions": [
        "Practical suggestion 1",
        "Practical suggestion 2"
    ]
}"""

    try:
        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://expenseshare-nine.vercel.app",
            "X-Title": "CampusSpend"
        }
        
        # Using gpt-4o-mini as it guarantees fast, high-quality, and structured JSON output on OpenRouter
        payload = {
            "model": "openai/gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here is the verified financial data:\n{json.dumps(compact_data, indent=2)}"}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.3
        }
        
        r = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=15)
        
        if r.status_code == 200:
            resp_json = r.json()
            content = resp_json['choices'][0]['message']['content']
            
            # Safely parse JSON
            content = content.strip()
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            
            try:
                output_json = json.loads(content.strip())
                # Validate the required JSON structure
                if "summary" in output_json and "insights" in output_json and "suggestions" in output_json:
                    response_data['ai'] = output_json
                else:
                    response_data['ai_error'] = "AI insights are temporarily unavailable."
            except json.JSONDecodeError:
                response_data['ai_error'] = "AI insights are temporarily unavailable."
                
        else:
            print("OpenRouter Error:", r.status_code, r.text)
            response_data['ai_error'] = f"OpenRouter Error {r.status_code}: AI insights are temporarily unavailable."
            
    except Exception as e:
        print("OpenRouter Exception:", str(e))
        response_data['ai_error'] = "AI insights are temporarily unavailable."

    return jsonify({"success": True, "data": response_data}), 200
