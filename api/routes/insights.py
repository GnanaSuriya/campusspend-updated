import os
import json
from datetime import datetime
from flask import Blueprint, jsonify, request
from models import Transaction, DirectSharedExpense, Budget, User
from database import db
from sqlalchemy import extract, or_
from utils.auth import require_auth
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
    month_year_str = now.strftime('%Y-%m')
    
    # 1. Fetch personal transactions
    personal_tx = Transaction.query.filter(
        Transaction.user_id == user_id,
        extract('month', Transaction.date) == now.month,
        extract('year', Transaction.date) == now.year
    ).all()
    
    # 2. Fetch effective shared expenses (Accepted, Change_Pending)
    shared_tx = DirectSharedExpense.query.filter(
        or_(DirectSharedExpense.creator_id == user_id, DirectSharedExpense.other_user_id == user_id),
        DirectSharedExpense.status.in_(['Accepted', 'Change_Pending'])
    ).all()
    
    if len(personal_tx) == 0 and len(shared_tx) == 0:
        return jsonify({"success": False, "error": "No spending data yet. Add a few expenses to unlock personalized AI insights."}), 400

    # 3. Aggregate totals
    total_spent = sum(t.amount for t in personal_tx)
    for stx in shared_tx:
        if stx.creator_id == user_id:
            total_spent += stx.total_amount * (stx.creator_percentage / 100.0)
        else:
            total_spent += stx.total_amount * (stx.other_percentage / 100.0)
            
    budgets = Budget.query.filter_by(user_id=user_id, month_year=month_year_str).all()
    overall_budget = sum(b.amount for b in budgets if b.category == 'Overall')
        
    remaining = overall_budget - total_spent
    percentage_used = round((total_spent / overall_budget * 100) if overall_budget > 0 else 0, 1)

    # 4. Aggregate categories
    cat_spent = {}
    for t in personal_tx:
        cat_spent[t.category] = cat_spent.get(t.category, 0) + t.amount
    for stx in shared_tx:
        cat = stx.category or 'Other'
        if stx.creator_id == user_id:
            cat_spent[cat] = cat_spent.get(cat, 0) + stx.total_amount * (stx.creator_percentage / 100.0)
        else:
            cat_spent[cat] = cat_spent.get(cat, 0) + stx.total_amount * (stx.other_percentage / 100.0)

    categories_data = []
    for b in budgets:
        if b.category != 'Overall':
            spent = cat_spent.get(b.category, 0)
            categories_data.append({
                "name": b.category,
                "budget": b.amount,
                "spent": round(spent, 2),
                "remaining": round(b.amount - spent, 2),
                "percentage_used": round((spent / b.amount * 100) if b.amount > 0 else 0, 1)
            })
            
    # Include unbudgeted categories that have spending
    budgeted_cats = set(b.category for b in budgets if b.category != 'Overall')
    for cat, spent in cat_spent.items():
        if cat not in budgeted_cats and spent > 0:
            categories_data.append({
                "name": cat,
                "budget": 0,
                "spent": round(spent, 2),
                "remaining": -round(spent, 2),
                "percentage_used": 100
            })
            
    summary_data = {
        "total_budget": overall_budget,
        "total_spent": round(total_spent, 2),
        "remaining": round(remaining, 2),
        "percentage_used": percentage_used,
        "categories": categories_data
    }

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
