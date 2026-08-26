from flask import Blueprint, jsonify
from datetime import datetime
from sqlalchemy import extract
from models import Transaction
from database import db
from utils.auth import require_auth
import calendar

insights_bp = Blueprint('insights', __name__)

@insights_bp.route('/insights', methods=['GET'])
@require_auth
def get_insights(user_id):
    now = datetime.utcnow()
    month = now.month
    year = now.year
    
    # Current month tx
    current_tx = Transaction.query.filter(
        Transaction.user_id == user_id,
        extract('month', Transaction.date) == month,
        extract('year', Transaction.date) == year
    ).all()
    
    # Last month tx
    last_month = month - 1 if month > 1 else 12
    last_month_year = year if month > 1 else year - 1
    
    last_tx = Transaction.query.filter(
        Transaction.user_id == user_id,
        extract('month', Transaction.date) == last_month,
        extract('year', Transaction.date) == last_month_year
    ).all()
    
    curr_total = sum(t.amount for t in current_tx)
    last_total = sum(t.amount for t in last_tx)
    
    insights = []
    
    # Trend insight
    if last_total > 0:
        diff = curr_total - last_total
        pct = (diff / last_total) * 100
        if diff > 0:
            insights.append(f"You've spent {pct:.1f}% more this month compared to last month.")
        else:
            insights.append(f"Great job! You've spent {-pct:.1f}% less this month compared to last month.")
            
    # Weekend vs Weekday
    weekend_spent = sum(t.amount for t in current_tx if t.date.weekday() >= 5)
    weekday_spent = sum(t.amount for t in current_tx if t.date.weekday() < 5)
    
    if weekend_spent > weekday_spent:
        insights.append("You tend to spend more on weekends.")
    else:
        insights.append("Most of your spending happens during weekdays.")
        
    return jsonify({"success": True, "data": insights}), 200

@insights_bp.route('/predictions', methods=['GET'])
@require_auth
def get_predictions(user_id):
    now = datetime.utcnow()
    day = now.day
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    
    current_tx = Transaction.query.filter(
        Transaction.user_id == user_id,
        extract('month', Transaction.date) == now.month,
        extract('year', Transaction.date) == now.year
    ).all()
    
    total_spent = sum(t.amount for t in current_tx)
    
    if day > 0 and total_spent > 0:
        daily_avg = total_spent / day
        predicted_end_month = daily_avg * days_in_month
    else:
        predicted_end_month = 0
        
    return jsonify({
        "success": True,
        "data": {
            "predicted_spend": predicted_end_month,
            "daily_average": daily_avg if 'daily_avg' in locals() else 0
        }
    }), 200
