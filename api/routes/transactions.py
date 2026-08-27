from flask import Blueprint, request, jsonify
from datetime import datetime
from sqlalchemy import extract
from models import Transaction, Budget, User
from database import db
from utils.auth import require_auth
from utils.financials import get_budget_summary

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('', methods=['GET'])
@require_auth
def get_transactions(user_id):
    txs = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.date.desc()).all()
    return jsonify({"success": True, "data": [t.to_dict() for t in txs]}), 200

@transactions_bp.route('', methods=['POST'])
@require_auth
def add_transaction(user_id):
    data = request.json
    try:
        amount = float(data['amount'])
    except ValueError:
        return jsonify({"success": False, "error": "Invalid amount"}), 400
        
    tx = Transaction(
        user_id=user_id,
        description=data['description'],
        amount=amount,
        category=data['category']
    )
    if 'date' in data and data['date']:
        try:
            tx.date = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
        except:
            pass
            
    db.session.add(tx)
    db.session.commit()
    return jsonify({"success": True, "data": tx.to_dict()}), 201

@transactions_bp.route('/<int:tx_id>', methods=['DELETE'])
@require_auth
def delete_transaction(user_id, tx_id):
    tx = Transaction.query.get(tx_id)
    if not tx or tx.user_id != user_id:
        return jsonify({"success": False, "error": "Not found or unauthorized"}), 404
        
    db.session.delete(tx)
    db.session.commit()
    return jsonify({"success": True, "data": None}), 200

@transactions_bp.route('/dashboard', methods=['GET'])
@require_auth
def get_dashboard(user_id):
    from models import DirectSharedExpenseParticipant, DirectSharedExpense
    from dateutil import parser
    user = User.query.get(user_id)
    now = datetime.utcnow()
    
    summary = get_budget_summary(user_id, now.month, now.year)
    
    # Map summary categories to legacy format
    cat_budgets = []
    cat_breakdown = []
    for c in summary["categories"]:
        if c["budget"] > 0:
            cat_budgets.append({"category": c["name"], "amount": c["budget"]})
        if c["spent"] > 0:
            cat_breakdown.append({"category": c["name"], "amount": c["spent"]})
            
    # Recent transactions
    all_recent = []
    for t in Transaction.query.filter_by(user_id=user_id).order_by(Transaction.date.desc()).limit(5).all():
        d = t.to_dict()
        d['is_shared'] = False
        all_recent.append(d)
        
    parts = DirectSharedExpenseParticipant.query.filter_by(user_id=user_id, status='Accepted').limit(10).all()
    for p in parts:
        ex = p.shared_expense
        d = ex.to_dict()
        d['is_shared'] = True
        d['amount'] = p.amount_owed
        all_recent.append(d)
        
    all_recent.sort(key=lambda x: parser.parse(x['date']), reverse=True)
    recent = all_recent[:5]
    
    pending_count = DirectSharedExpenseParticipant.query.filter_by(user_id=user_id, status='Pending').count()
    
    return jsonify({
        "success": True, 
        "data": {
            "name": user.name,
            "budget": summary["total_budget"],
            "remaining": summary["remaining"],
            "total_spent": summary["total_spent"],
            "category_budgets": cat_budgets,
            "category_breakdown": cat_breakdown,
            "recent_transactions": recent,
            "pending_requests_count": pending_count
        }
    }), 200
