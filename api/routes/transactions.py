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
    user = User.query.get(user_id)
    now = datetime.utcnow()
    
    summary = get_budget_summary(user_id, now.month, now.year)
    
    return jsonify({
        "success": True, 
        "data": {
            "name": user.name,
            "overall_budget": summary["total_budget"],
            "total_spent": summary["total_spent"],
            "category_budgets": summary["categories"]
        }
    }), 200
