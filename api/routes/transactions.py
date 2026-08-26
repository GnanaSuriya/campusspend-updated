from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from sqlalchemy import func, extract
from models import Transaction, Budget, User
from database import db
from utils.auth import require_auth
from dateutil import parser

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('', methods=['GET'])
@require_auth
def get_transactions(user_id):
    query = Transaction.query.filter_by(user_id=user_id)
    
    # Optional filtering
    category = request.args.get('category')
    if category:
        query = query.filter_by(category=category)
        
    start_date = request.args.get('start_date')
    if start_date:
        query = query.filter(Transaction.date >= parser.parse(start_date))
        
    end_date = request.args.get('end_date')
    if end_date:
        query = query.filter(Transaction.date <= parser.parse(end_date))
        
    # Sort by date descending
    transactions = query.order_by(Transaction.date.desc()).all()
    
    return jsonify({
        "success": True,
        "data": [t.to_dict() for t in transactions]
    }), 200

@transactions_bp.route('', methods=['POST'])
@require_auth
def add_transaction(user_id):
    data = request.json
    if not data.get('amount') or not data.get('category'):
        return jsonify({"success": False, "error": "Amount and category are required"}), 400
        
    try:
        amount = float(data['amount'])
    except ValueError:
        return jsonify({"success": False, "error": "Amount must be a number"}), 400
        
    date_val = datetime.utcnow()
    if 'date' in data:
        try:
            date_val = parser.parse(data['date'])
        except:
            pass

    new_tx = Transaction(
        user_id=user_id,
        amount=amount,
        category=data['category'],
        description=data.get('description', ''),
        date=date_val,
        payment_method=data.get('payment_method', '')
    )
    
    db.session.add(new_tx)
    db.session.commit()
    
    return jsonify({"success": True, "data": new_tx.to_dict()}), 201

@transactions_bp.route('/<int:tx_id>', methods=['DELETE'])
@require_auth
def delete_transaction(user_id, tx_id):
    tx = Transaction.query.filter_by(id=tx_id, user_id=user_id).first()
    if not tx:
        return jsonify({"success": False, "error": "Transaction not found"}), 404
        
    db.session.delete(tx)
    db.session.commit()
    
    return jsonify({"success": True, "data": None}), 200

@transactions_bp.route('/<int:tx_id>', methods=['PATCH'])
@require_auth
def update_transaction(user_id, tx_id):
    tx = Transaction.query.filter_by(id=tx_id, user_id=user_id).first()
    if not tx:
        return jsonify({"success": False, "error": "Transaction not found"}), 404
        
    data = request.json
    if 'amount' in data:
        try:
            tx.amount = float(data['amount'])
        except ValueError:
            return jsonify({"success": False, "error": "Amount must be a number"}), 400
    if 'category' in data:
        tx.category = data['category']
    if 'description' in data:
        tx.description = data['description']
    if 'payment_method' in data:
        tx.payment_method = data['payment_method']
    if 'date' in data:
        try:
            tx.date = parser.parse(data['date'])
        except:
            pass
            
    db.session.commit()
    return jsonify({"success": True, "data": tx.to_dict()}), 200

@transactions_bp.route('/dashboard', methods=['GET'])
@require_auth
def get_dashboard(user_id):
    now = datetime.utcnow()
    month = now.month
    year = now.year
    month_year_str = f"{year}-{month:02d}"
    
    # 1. Get personal transactions
    this_month_tx = Transaction.query.filter(
        Transaction.user_id == user_id,
        extract('month', Transaction.date) == month,
        extract('year', Transaction.date) == year
    ).all()
    
    # 2. Get direct shared expenses
    from models import DirectSharedExpense
    from sqlalchemy import or_
    shared_tx = DirectSharedExpense.query.filter(
        or_(
            DirectSharedExpense.creator_id == user_id,
            DirectSharedExpense.other_user_id == user_id
        ),
        extract('month', DirectSharedExpense.date) == month,
        extract('year', DirectSharedExpense.date) == year
    ).all()

    # Total spent
    total_spent = sum(t.amount for t in this_month_tx)
    for stx in shared_tx:
        if stx.status in ['Accepted', 'Change_Pending']:
            if stx.creator_id == user_id:
                total_spent += stx.total_amount * (stx.creator_percentage / 100.0)
            elif stx.other_user_id == user_id:
                total_spent += stx.total_amount * (stx.other_percentage / 100.0)
    
    # Category breakdown
    category_totals = {}
    for t in this_month_tx:
        category_totals[t.category] = category_totals.get(t.category, 0) + t.amount
    
    for stx in shared_tx:
        if stx.status in ['Accepted', 'Change_Pending']:
            cat = stx.category or 'Other'
            if stx.creator_id == user_id:
                amount = stx.total_amount * (stx.creator_percentage / 100.0)
                category_totals[cat] = category_totals.get(cat, 0) + amount
            elif stx.other_user_id == user_id:
                amount = stx.total_amount * (stx.other_percentage / 100.0)
                category_totals[cat] = category_totals.get(cat, 0) + amount
        
    # Get budget
    budgets = Budget.query.filter_by(user_id=user_id, month_year=month_year_str).all()
    budget_amount = 0
    cat_budgets = []
    for b in budgets:
        if b.category == 'Overall':
            budget_amount = b.amount
        else:
            cat_budgets.append({"category": b.category, "amount": b.amount})
    
    # Get recent transactions (last 5 total)
    # Convert personal to generic dicts
    all_recent = []
    for t in Transaction.query.filter_by(user_id=user_id).order_by(Transaction.date.desc()).limit(5).all():
        d = t.to_dict()
        d['is_shared'] = False
        all_recent.append(d)
        
    for stx in DirectSharedExpense.query.filter(
        or_(DirectSharedExpense.creator_id == user_id, DirectSharedExpense.other_user_id == user_id)
    ).order_by(DirectSharedExpense.date.desc()).limit(10).all():
        if stx.status not in ['Accepted', 'Change_Pending']:
            continue
            
        d = stx.to_dict()
        d['is_shared'] = True
        # Overwrite amount for display in recent
        if stx.creator_id == user_id:
            d['amount'] = stx.total_amount * (stx.creator_percentage / 100.0)
        else:
            d['amount'] = stx.total_amount * (stx.other_percentage / 100.0)
        all_recent.append(d)
        
    # Sort combined and limit to 5
    all_recent.sort(key=lambda x: parser.parse(x['date']), reverse=True)
    recent = all_recent[:5]
    
    # Check if the user has any pending requests as a receiver
    pending_count = DirectSharedExpense.query.filter_by(other_user_id=user_id, status='Pending').count()
    change_pending_count = DirectSharedExpense.query.filter(
        DirectSharedExpense.other_user_id == user_id, 
        DirectSharedExpense.status == 'Change_Pending',
        DirectSharedExpense.change_requested_by != user_id
    ).count() + DirectSharedExpense.query.filter(
        DirectSharedExpense.creator_id == user_id, 
        DirectSharedExpense.status == 'Change_Pending',
        DirectSharedExpense.change_requested_by != user_id
    ).count()
    
    return jsonify({
        "success": True,
        "data": {
            "total_spent": total_spent,
            "budget": budget_amount,
            "category_budgets": cat_budgets,
            "remaining": budget_amount - total_spent if budget_amount > 0 else 0,
            "category_breakdown": [{"category": k, "amount": v} for k, v in category_totals.items()],
            "recent_transactions": recent,
            "pending_requests_count": pending_count + change_pending_count
        }
    }), 200
