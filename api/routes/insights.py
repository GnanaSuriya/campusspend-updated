import os
import json
from datetime import datetime
from flask import Blueprint, jsonify
from utils.auth import require_auth
from utils.financials import get_budget_summary
from models import Transaction, DirectSharedExpense, Budget, User
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

insights_bp = Blueprint('insights', __name__)

class SavingSuggestion(BaseModel):
    category: str
    current_spending: float
    suggested_reduction: float
    suggestion: str

class TopCategory(BaseModel):
    name: str
    amount: float
    percentage: float

class AIInsights(BaseModel):
    summary: str
    top_category: TopCategory
    warnings: list[str]
    saving_suggestions: list[SavingSuggestion]
    recommendations: list[str]

@insights_bp.route('/insights', methods=['POST'])
@require_auth
def generate_insights(user_id):
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("Missing GEMINI_API_KEY")
        return jsonify({"success": False, "error": "Insights are temporarily unavailable."}), 503

    now = datetime.utcnow()
    
    summary_data = get_budget_summary(user_id, now.month, now.year)
    
    if summary_data['total_spent'] == 0:
        return jsonify({"success": False, "error": "No spending data yet. Add a few expenses to unlock personalized AI insights."}), 400

    prompt = f"""
You are a personalized AI financial advisor inside the CampusSpend app.
Analyze the following strictly factual financial summary of a student's spending for the current month.
Return 3-5 personalized insights as structured JSON.
Do not generate generic advice like "spend less". Focus on specific categories, real numbers from the data, and mathematically sound recommendations.
The suggested saving amount must be reasonable and explicitly reference the user's spending data.

FINANCIAL DATA:
{json.dumps(summary_data, indent=2)}
"""

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AIInsights,
                temperature=0.4
            ),
        )
        # Parse the JSON explicitly
        output_json = json.loads(response.text)
        return jsonify({"success": True, "data": output_json}), 200
        
    except Exception as e:
        print("Gemini API Error:", str(e))
        return jsonify({"success": False, "error": "Insights are temporarily unavailable. Please try again later."}), 503

@insights_bp.route('/charts', methods=['GET'])
@require_auth
def get_charts(user_id):
    now = datetime.utcnow()
    month = now.month
    year = now.year
    
    # We will just fetch all transactions for this month
    personal_tx = Transaction.query.filter(
        Transaction.user_id == user_id,
        extract('month', Transaction.date) == month,
        extract('year', Transaction.date) == year
    ).all()
    
    from models import DirectSharedExpenseParticipant, DirectSettlement, DirectSharedExpensePayer
    participants = DirectSharedExpenseParticipant.query.filter(
        DirectSharedExpenseParticipant.user_id == user_id,
        DirectSharedExpenseParticipant.status == 'Accepted'
    ).all()
    
    # Group by week (1 to 4)
    weeks = [0, 0, 0, 0, 0] # indices 0-4 (week 1 to 5)
    
    for t in personal_tx:
        day = t.date.day
        week_idx = min((day - 1) // 7, 4)
        weeks[week_idx] += t.amount
        
    for p in participants:
        ex = p.shared_expense
        if ex.date.month == month and ex.date.year == year:
            day = ex.date.day
            week_idx = min((day - 1) // 7, 4)
            
            has_completed_settlements = DirectSettlement.query.filter_by(expense_id=ex.id, status='COMPLETED').first() is not None
            if ex.status == 'Completed' or has_completed_settlements:
                # Add settlements paid
                settlements_paid = sum(s.amount for s in DirectSettlement.query.filter_by(expense_id=ex.id, debtor_id=user_id, status='COMPLETED').all())
                # Subtract settlements received
                settlements_received = sum(s.amount for s in DirectSettlement.query.filter_by(expense_id=ex.id, creditor_id=user_id, status='COMPLETED').all())
                
                # We ALSO need to add what they paid out of pocket, because insights tracks overall spending by week!
                # If they paid 500, and settlement is 550, they spent 1050 this week.
                payer_record = DirectSharedExpensePayer.query.filter_by(expense_id=ex.id, user_id=user_id).first()
                paid = payer_record.amount_paid if payer_record else 0
                
                weeks[week_idx] += (paid + settlements_paid - settlements_received)
            else:
                weeks[week_idx] += p.amount_owed
            
    chart_data = [
        {"name": "Week 1", "amount": round(weeks[0], 2)},
        {"name": "Week 2", "amount": round(weeks[1], 2)},
        {"name": "Week 3", "amount": round(weeks[2], 2)},
        {"name": "Week 4", "amount": round(weeks[3] + weeks[4], 2)}
    ]
    
    from utils.financials import get_budget_summary
    from models import Transaction, DirectSharedExpense, Budget, User
    summary = get_budget_summary(user_id, month, year)
    
    pie_data = []
    for c in summary['categories']:
        if c['spent'] > 0:
            pie_data.append({"name": c['name'], "value": c['spent']})
            
    return jsonify({
        "success": True, 
        "data": {
            "weekly": chart_data,
            "categories": pie_data
        }
    }), 200




