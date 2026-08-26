from flask import Blueprint, request, jsonify
from datetime import datetime
from models import DirectSharedExpense, User, Alert
from database import db
from utils.auth import require_auth
from sqlalchemy import or_
from dateutil import parser
import json

direct_shared_bp = Blueprint('direct_shared', __name__)

@direct_shared_bp.route('', methods=['GET'])
@require_auth
def get_shared_expenses(user_id):
    user = User.query.get(user_id)
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
    
    required = ['total_amount', 'creator_percentage', 'other_user_name', 'category']
    if not all(k in data for k in required):
        return jsonify({"success": False, "error": "Missing required fields"}), 400
        
    try:
        total_amount = float(data['total_amount'])
        creator_percentage = float(data['creator_percentage'])
        other_percentage = 100.0 - creator_percentage
    except ValueError:
        return jsonify({"success": False, "error": "Invalid numerical values"}), 400
        
    other_name = data['other_user_name'].strip()
    
    current_user = User.query.get(user_id)
    if other_name.lower() == current_user.name.lower():
        return jsonify({"success": False, "error": "Cannot share an expense with yourself"}), 400
        
    other_user = User.query.filter(db.func.lower(User.name) == other_name.lower()).first()
    if not other_user:
        return jsonify({"success": False, "error": "Friend not found. No account exists with this name."}), 404
    
    date_val = datetime.utcnow()
    if 'date' in data and data['date']:
        try:
            date_val = parser.parse(data['date'])
        except:
            pass

    expense = DirectSharedExpense(
        creator_id=user_id,
        other_user_id=other_user.id,
        other_user_email=other_user.email,
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
    
    # If it's just a status update
    if 'status' in data and len(data) <= 2:
        new_status = data['status']
        if new_status == 'Declined':
            if 'decline_reason' not in data or not data['decline_reason'].strip():
                return jsonify({"success": False, "error": "Decline reason is mandatory"}), 400
            expense.decline_reason = data['decline_reason'].strip()
            alert_msg = f"? {expense.other_user.name} declined your shared expense request ({expense.description}). Reason: {expense.decline_reason}"
            db.session.add(Alert(user_id=expense.creator_id, message=alert_msg))
            
        elif new_status == 'Accepted':
            alert_msg = f"? {expense.other_user.name} accepted your shared expense request ({expense.description})."
            db.session.add(Alert(user_id=expense.creator_id, message=alert_msg))
            
        expense.status = new_status
        db.session.commit()
        return jsonify({"success": True, "data": expense.to_dict()}), 200

    modifying_fields = False
    new_changes = {}
    
    if 'creator_percentage' in data:
        try:
            pct = float(data['creator_percentage'])
            if pct != expense.creator_percentage:
                new_changes['creator_percentage'] = pct
                new_changes['other_percentage'] = 100.0 - pct
                modifying_fields = True
        except ValueError:
            pass
            
    if 'total_amount' in data:
        try:
            amt = float(data['total_amount'])
            if amt != expense.total_amount:
                new_changes['total_amount'] = amt
                modifying_fields = True
        except ValueError:
            pass
            
    if 'description' in data and data['description'] != expense.description:
        new_changes['description'] = data['description']
        modifying_fields = True
        
    if 'category' in data and data['category'] != expense.category:
        new_changes['category'] = data['category']
        modifying_fields = True

    if modifying_fields:
        if expense.status == 'Accepted':
            expense.status = 'Change_Pending'
            expense.pending_changes = json.dumps(new_changes)
            expense.change_requested_by = user_id
        else:
            if 'creator_percentage' in new_changes:
                expense.creator_percentage = new_changes['creator_percentage']
                expense.other_percentage = new_changes['other_percentage']
            if 'total_amount' in new_changes:
                expense.total_amount = new_changes['total_amount']
            if 'description' in new_changes:
                expense.description = new_changes['description']
            if 'category' in new_changes:
                expense.category = new_changes['category']
            
            if expense.status == 'Declined' and expense.creator_id == user_id:
                expense.status = 'Pending'

    db.session.commit()
    return jsonify({"success": True, "data": expense.to_dict()}), 200

@direct_shared_bp.route('/<int:exp_id>/approve_change', methods=['POST'])
@require_auth
def approve_change(user_id, exp_id):
    user_id = int(user_id)
    expense = DirectSharedExpense.query.get(exp_id)
    if not expense or expense.status != 'Change_Pending':
        return jsonify({"success": False, "error": "Invalid request"}), 400
        
    if expense.creator_id != user_id and expense.other_user_id != user_id:
        return jsonify({"success": False, "error": "Unauthorized"}), 403
        
    if expense.change_requested_by == user_id:
        return jsonify({"success": False, "error": "You cannot approve your own change request"}), 400
        
    if expense.pending_changes:
        try:
            changes = json.loads(expense.pending_changes)
            if 'creator_percentage' in changes:
                expense.creator_percentage = changes['creator_percentage']
                expense.other_percentage = changes['other_percentage']
            if 'total_amount' in changes:
                expense.total_amount = changes['total_amount']
            if 'description' in changes:
                expense.description = changes['description']
            if 'category' in changes:
                expense.category = changes['category']
        except Exception:
            pass
            
    expense.status = 'Accepted'
    expense.pending_changes = None
    expense.change_requested_by = None
    
    db.session.commit()
    return jsonify({"success": True, "data": expense.to_dict()}), 200

@direct_shared_bp.route('/<int:exp_id>/reject_change', methods=['POST'])
@require_auth
def reject_change(user_id, exp_id):
    user_id = int(user_id)
    expense = DirectSharedExpense.query.get(exp_id)
    if not expense or expense.status != 'Change_Pending':
        return jsonify({"success": False, "error": "Invalid request"}), 400
        
    if expense.creator_id != user_id and expense.other_user_id != user_id:
        return jsonify({"success": False, "error": "Unauthorized"}), 403
        
    if expense.change_requested_by == user_id:
        return jsonify({"success": False, "error": "You cannot reject your own change request"}), 400
        
    expense.status = 'Accepted'
    expense.pending_changes = None
    expense.change_requested_by = None
    
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
