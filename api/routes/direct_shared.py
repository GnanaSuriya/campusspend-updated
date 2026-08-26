from flask import Blueprint, request, jsonify
from datetime import datetime
from models import DirectSharedExpense, User
from database import db
from utils.auth import require_auth
from sqlalchemy import or_
from dateutil import parser

direct_shared_bp = Blueprint('direct_shared', __name__)

@direct_shared_bp.route('', methods=['GET'])
@require_auth
def get_shared_expenses(user_id):
    user = User.query.get(user_id)
    
    # Get all where user is creator OR where user is the other person
    expenses = DirectSharedExpense.query.filter(
        or_(
            DirectSharedExpense.creator_id == user_id,
            DirectSharedExpense.other_user_id == user_id
        )
    ).order_by(DirectSharedExpense.date.desc()).all()
    
    # Try to link any pending expenses that were created with this user's email before they joined
    updated = False
    pending_expenses = DirectSharedExpense.query.filter(
        DirectSharedExpense.other_user_id == None,
        DirectSharedExpense.other_user_email == user.email
    ).all()
    
    for exp in pending_expenses:
        exp.other_user_id = user.id
        updated = True
        
    if updated:
        db.session.commit()
        # Refetch after update
        expenses = DirectSharedExpense.query.filter(
            or_(
                DirectSharedExpense.creator_id == user_id,
                DirectSharedExpense.other_user_id == user_id
            )
        ).order_by(DirectSharedExpense.date.desc()).all()

    return jsonify({
        "success": True,
        "data": [e.to_dict() for e in expenses]
    }), 200

@direct_shared_bp.route('', methods=['POST'])
@require_auth
def create_shared_expense(user_id):
    data = request.json
    
    required = ['total_amount', 'creator_percentage', 'other_user_email', 'category']
    if not all(k in data for k in required):
        return jsonify({"success": False, "error": "Missing required fields"}), 400
        
    try:
        total_amount = float(data['total_amount'])
        creator_percentage = float(data['creator_percentage'])
        other_percentage = 100.0 - creator_percentage
    except ValueError:
        return jsonify({"success": False, "error": "Invalid numerical values"}), 400
        
    other_email = data['other_user_email'].lower().strip()
    
    if other_email == User.query.get(user_id).email.lower().strip():
        return jsonify({"success": False, "error": "Cannot share an expense with yourself"}), 400
        
    other_user = User.query.filter(db.func.lower(User.email) == other_email).first()
    if not other_user:
        return jsonify({"success": False, "error": "This account doesn't exist."}), 404
    
    date_val = datetime.utcnow()
    if 'date' in data and data['date']:
        try:
            date_val = parser.parse(data['date'])
        except:
            pass

    expense = DirectSharedExpense(
        creator_id=user_id,
        other_user_id=other_user.id,
        other_user_email=other_email,
        total_amount=total_amount,
        creator_percentage=creator_percentage,
        other_percentage=other_percentage,
        description=data.get('description', ''),
        category=data.get('category'),
        date=date_val,
        status='Pending'
    )
    
    db.session.add(expense)
    db.session.commit()
    
    return jsonify({"success": True, "data": expense.to_dict()}), 201

@direct_shared_bp.route('/<int:exp_id>', methods=['PATCH'])
@require_auth
def update_shared_expense(user_id, exp_id):
    user_id = int(user_id)
    expense = DirectSharedExpense.query.get(exp_id)
    if not expense:
        return jsonify({"success": False, "error": "Expense not found"}), 404
        
    if expense.creator_id != user_id and expense.other_user_id != user_id:
        return jsonify({"success": False, "error": "Unauthorized"}), 403
        
    data = request.json
            
    if 'creator_percentage' in data:
        try:
            new_creator_pct = float(data['creator_percentage'])
            expense.creator_percentage = new_creator_pct
            expense.other_percentage = 100.0 - new_creator_pct
        except ValueError:
            return jsonify({"success": False, "error": "Invalid percentage"}), 400
            
    if 'status' in data:
        new_status = data['status']
        if new_status == 'Declined':
            if 'decline_reason' not in data or not data['decline_reason'].strip():
                return jsonify({"success": False, "error": "Decline reason is mandatory"}), 400
            expense.decline_reason = data['decline_reason'].strip()
            
            # Send alert to creator
            from models import Alert
            alert_msg = f"✕ {expense.other_user.name} declined your shared expense request ({expense.description}). Reason: {expense.decline_reason}"
            db.session.add(Alert(user_id=expense.creator_id, message=alert_msg))
            
        elif new_status == 'Accepted':
            # Send alert to creator
            from models import Alert
            alert_msg = f"✓ {expense.other_user.name} accepted your shared expense request ({expense.description})."
            db.session.add(Alert(user_id=expense.creator_id, message=alert_msg))
            
        expense.status = new_status
        
    db.session.commit()
    return jsonify({"success": True, "data": expense.to_dict()}), 200

@direct_shared_bp.route('/<int:exp_id>', methods=['DELETE'])
@require_auth
def delete_shared_expense(user_id, exp_id):
    user_id = int(user_id)
    expense = DirectSharedExpense.query.get(exp_id)
    if not expense:
        return jsonify({"success": False, "error": "Expense not found"}), 404
        
    if expense.creator_id != user_id and expense.other_user_id != user_id:
        return jsonify({"success": False, "error": "Unauthorized"}), 403
        
    db.session.delete(expense)
    db.session.commit()
    
    return jsonify({"success": True, "data": None}), 200
