from flask import Blueprint, request, jsonify
from datetime import datetime
from sqlalchemy import extract
from models import Budget, Transaction, Alert
from database import db
from utils.auth import require_auth

budgets_bp = Blueprint('budgets', __name__)

@budgets_bp.route('', methods=['GET'])
@require_auth
def get_budgets(user_id):
    month_year = request.args.get('month_year')
    if not month_year:
        now = datetime.utcnow()
        month_year = f"{now.year}-{now.month:02d}"
        
    budgets = Budget.query.filter_by(user_id=user_id, month_year=month_year).all()
    return jsonify({
        "success": True,
        "data": [b.to_dict() for b in budgets]
    }), 200

@budgets_bp.route('', methods=['POST'])
@require_auth
def set_budget(user_id):
    data = request.json
    category = data.get('category', 'Overall')
    amount = data.get('amount')
    month_year = data.get('month_year')
    
    if not amount or not month_year:
        return jsonify({"success": False, "error": "Amount and month_year are required"}), 400
        
    try:
        amount = float(amount)
    except ValueError:
        return jsonify({"success": False, "error": "Amount must be a number"}), 400
        
    budget = Budget.query.filter_by(user_id=user_id, category=category, month_year=month_year).first()
    if budget:
        budget.amount = amount
    else:
        budget = Budget(user_id=user_id, category=category, amount=amount, month_year=month_year)
        db.session.add(budget)
        
    db.session.commit()
    return jsonify({"success": True, "data": budget.to_dict()}), 200

@budgets_bp.route('/alerts', methods=['GET'])
@require_auth
def get_alerts(user_id):
    now = datetime.utcnow()
    month = now.month
    year = now.year
    month_year = f"{year}-{month:02d}"
    
    # Calculate spending vs budget to generate alerts on the fly
    budget = Budget.query.filter_by(user_id=user_id, category='Overall', month_year=month_year).first()
    if not budget:
        return jsonify({"success": True, "data": []}), 200
        
    this_month_tx = Transaction.query.filter(
        Transaction.user_id == user_id,
        extract('month', Transaction.date) == month,
        extract('year', Transaction.date) == year
    ).all()
    
    total_spent = sum(t.amount for t in this_month_tx)
    
    alerts = []
    if budget.amount > 0:
        ratio = total_spent / budget.amount
        if ratio >= 1.0:
            alerts.append({"type": "exceeded", "message": "You have exceeded your overall budget for this month."})
        elif ratio >= 0.9:
            alerts.append({"type": "warning_90", "message": "You have spent over 90% of your overall budget."})
        elif ratio >= 0.7:
            alerts.append({"type": "warning_70", "message": "You have spent over 70% of your overall budget."})
            
    # Save alerts to DB if needed, but returning dynamically is fine for this scope
    return jsonify({
        "success": True,
        "data": alerts
    }), 200
