from flask import Blueprint, request, jsonify
from datetime import datetime
from models import DirectSharedExpense, DirectSharedExpenseActivity, DirectSharedExpenseParticipant, DirectSharedExpensePayer, User, Alert
from database import db
from utils.auth import require_auth
from sqlalchemy import or_
from dateutil import parser
import json

direct_shared_bp = Blueprint('direct_shared', __name__)

def log_activity(expense_id, user_id, action, details=None, reason=None):
    details_str = json.dumps(details) if details else None
    activity = DirectSharedExpenseActivity(
        expense_id=expense_id,
        user_id=user_id,
        action=action,
        details=details_str,
        reason=reason
    )
    db.session.add(activity)

@direct_shared_bp.route('', methods=['GET'])
@require_auth
def get_shared_expenses(user_id):
    participant_expenses = DirectSharedExpenseParticipant.query.filter_by(user_id=user_id).all()
    pe_ids = [p.expense_id for p in participant_expenses]
    
    payer_expenses = DirectSharedExpensePayer.query.filter_by(user_id=user_id).all()
    pa_ids = [p.expense_id for p in payer_expenses]
    
    expenses = DirectSharedExpense.query.filter(
        or_(
            DirectSharedExpense.creator_id == user_id,
            DirectSharedExpense.other_user_id == user_id,
            DirectSharedExpense.id.in_(pe_ids),
            DirectSharedExpense.id.in_(pa_ids)
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
    current_user = User.query.get(user_id)
    
    # New multi-payer format check
    if 'participants' in data and 'payers' in data:
        total_amount = float(data.get('total_amount', 0))
        
        # Determine first friend for legacy fallback
        first_friend = None
        for p in data['participants']:
            uid = p.get('user_id')
            if uid and uid != user_id:
                first_friend = User.query.get(uid)
                if first_friend:
                    break
        
        if not first_friend:
            return jsonify({"success": False, "error": "Must include at least one valid friend."}), 400
            
        expense = DirectSharedExpense(
            creator_id=user_id,
            other_user_id=first_friend.id,
            other_user_email=first_friend.email,
            total_amount=total_amount,
            creator_percentage=0, # Legacy fallback
            other_percentage=100, # Legacy fallback
            description=data.get('description', ''),
            category=data.get('category'),
            split_mode=data.get('split_mode', 'Uniform'),
            status='Pending'
        )
        db.session.add(expense)
        # Pre-validate all participants and payers before flushing the expense
        for p in data['participants']:
            uid = p.get('user_id')
            if not uid:
                return jsonify({"success": False, "error": "Friend not found", "message": f"No CampusSpend account exists with this name: {p.get('user_name')}"}), 400
            u = User.query.get(uid)
            if not u:
                return jsonify({"success": False, "error": "Friend not found", "message": f"No CampusSpend account exists with this name: {p.get('user_name')}"}), 400
                
        for p in data['payers']:
            uid = p.get('user_id')
            if not uid:
                return jsonify({"success": False, "error": "Friend not found", "message": f"No CampusSpend account exists with this name: {p.get('user_name')}"}), 400
            u = User.query.get(uid)
            if not u:
                return jsonify({"success": False, "error": "Friend not found", "message": f"No CampusSpend account exists with this name: {p.get('user_name')}"}), 400
                
        db.session.flush() # get id
        
        # Add Participants
        for p in data['participants']:
            st = 'Accepted' if p['user_id'] == user_id else 'Pending'
            part = DirectSharedExpenseParticipant(
                expense_id=expense.id,
                user_id=p['user_id'],
                amount_owed=float(p['amount']),
                percentage=float(p['percentage']),
                status=st
            )
            db.session.add(part)
            
        # Add Payers
        for p in data['payers']:
            payer = DirectSharedExpensePayer(
                expense_id=expense.id,
                user_id=p['user_id'],
                amount_paid=float(p['amount'])
            )
            db.session.add(payer)
            
        log_activity(expense.id, user_id, 'created', details={"total_amount": total_amount, "description": data.get('description', '')})
        db.session.commit()
        return jsonify({"success": True, "data": expense.to_dict()}), 201

    else:
        # Legacy 1-to-1 fallback
        required = ['total_amount', 'creator_percentage', 'other_user_name', 'category']
        if not all(k in data for k in required):
            return jsonify({"success": False, "error": "Missing required fields"}), 400
            
        total_amount = float(data['total_amount'])
        creator_percentage = float(data['creator_percentage'])
        other_percentage = 100.0 - creator_percentage
        other_name = data['other_user_name'].strip()
        
        if other_name.lower() == current_user.name.lower():
            return jsonify({"success": False, "error": "Cannot share an expense with yourself"}), 400
            
        other_user = User.query.filter(db.func.lower(User.name) == other_name.lower()).first()
        if not other_user:
            return jsonify({"success": False, "error": "Friend not found. No account exists with this name."}), 404

        expense = DirectSharedExpense(
            creator_id=user_id,
            other_user_id=other_user.id,
            other_user_email=other_user.email,
            total_amount=total_amount,
            creator_percentage=creator_percentage,
            other_percentage=other_percentage,
            description=data.get('description', ''),
            category=data.get('category'),
            status='Pending'
        )
        db.session.add(expense)
        db.session.flush()
        
        # Seed new participant tables to ensure backwards compatibility flows smoothly
        p1 = DirectSharedExpenseParticipant(expense_id=expense.id, user_id=user_id, amount_owed=(total_amount*creator_percentage)/100, percentage=creator_percentage, status='Accepted')
        p2 = DirectSharedExpenseParticipant(expense_id=expense.id, user_id=other_user.id, amount_owed=(total_amount*other_percentage)/100, percentage=other_percentage, status='Pending')
        payer = DirectSharedExpensePayer(expense_id=expense.id, user_id=user_id, amount_paid=total_amount)
        db.session.add_all([p1, p2, payer])
        
        log_activity(expense.id, user_id, 'created', details={"total_amount": total_amount})
        db.session.commit()
        return jsonify({"success": True, "data": expense.to_dict()}), 201

@direct_shared_bp.route('/<int:exp_id>', methods=['PATCH'])
@require_auth
def update_shared_expense(user_id, exp_id):
    user_id = int(user_id)
    expense = DirectSharedExpense.query.get(exp_id)
    if not expense:
        return jsonify({"success": False, "error": "Expense not found"}), 404
        
    data = request.json
    
    # Check if it's an Accept/Decline action
    if 'status' in data and len(data) <= 2:
        participant = DirectSharedExpenseParticipant.query.filter_by(expense_id=exp_id, user_id=user_id).first()
        if not participant and expense.other_user_id != user_id:
            return jsonify({"success": False, "error": "Unauthorized"}), 403
            
        new_status = data['status']
        if new_status == 'Declined':
            if 'decline_reason' not in data or not data['decline_reason'].strip():
                return jsonify({"success": False, "error": "Decline reason is mandatory"}), 400
            if participant:
                participant.status = 'Declined'
                participant.decline_reason = data['decline_reason'].strip()
            expense.status = 'Declined' # legacy fallback
            log_activity(expense.id, user_id, 'declined', reason=data['decline_reason'].strip())
            
        elif new_status == 'Accepted':
            if participant:
                participant.status = 'Accepted'
            expense.status = 'Accepted' # legacy fallback
            log_activity(expense.id, user_id, 'accepted')
            
        db.session.commit()
        return jsonify({"success": True, "data": expense.to_dict()}), 200

    # If it's editing fields, ONLY CREATOR can edit
    if expense.creator_id != user_id:
        return jsonify({"success": False, "error": "Only the creator can edit this expense"}), 403

    if 'pending_changes' in data: # new schema for editing all fields (participants/payers)
        if expense.pending_changes:
            return jsonify({"success": False, "error": "A change request is already pending"}), 409
            
        expense.status = 'Change_Pending'
        expense.pending_changes = json.dumps(data['pending_changes'])
        expense.change_requested_by = user_id
        log_activity(expense.id, user_id, 'change_requested', details=data['pending_changes'])
        db.session.commit()
        return jsonify({"success": True, "data": expense.to_dict()}), 200

    db.session.commit()
    return jsonify({"success": True, "data": expense.to_dict()}), 200

@direct_shared_bp.route('/<int:exp_id>/approve_change', methods=['POST'])
@require_auth
def approve_change(user_id, exp_id):
    user_id = int(user_id)
    expense = DirectSharedExpense.query.get(exp_id)
    if not expense or expense.status != 'Change_Pending':
        return jsonify({"success": False, "error": "Invalid request"}), 400
        
    participant = DirectSharedExpenseParticipant.query.filter_by(expense_id=exp_id, user_id=user_id).first()
    if not participant and expense.other_user_id != user_id:
        return jsonify({"success": False, "error": "Unauthorized"}), 403
        
    if expense.change_requested_by == user_id:
        return jsonify({"success": False, "error": "You cannot approve your own change request"}), 400
        
    if expense.pending_changes:
        try:
            changes = json.loads(expense.pending_changes)
            
            # Apply changes to actual fields
            if 'total_amount' in changes:
                expense.total_amount = changes['total_amount']
            if 'description' in changes:
                expense.description = changes['description']
            if 'category' in changes:
                expense.category = changes['category']
            if 'split_mode' in changes:
                expense.split_mode = changes['split_mode']
                
            if 'participants' in changes:
                DirectSharedExpenseParticipant.query.filter_by(expense_id=exp_id).delete()
                for p in changes['participants']:
                    u = User.query.filter(db.func.lower(User.name) == p['user_name'].strip().lower()).first()
                    st = 'Accepted' if u.id == expense.creator_id else 'Accepted' # the approver just approved it, so everyone is Accepted (assuming 2-way approval for now)
                    # For multi-party, technically everyone should approve. But for simplicity here, if anyone approves, we apply it. 
                    # The frontend only shows the approve button to people who didn't request the change.
                    part = DirectSharedExpenseParticipant(
                        expense_id=expense.id,
                        user_id=u.id,
                        amount_owed=float(p['amount']),
                        percentage=float(p['percentage']),
                        status=st
                    )
                    db.session.add(part)
                    
            if 'payers' in changes:
                DirectSharedExpensePayer.query.filter_by(expense_id=exp_id).delete()
                for p in changes['payers']:
                    u = User.query.filter(db.func.lower(User.name) == p['user_name'].strip().lower()).first()
                    payer = DirectSharedExpensePayer(
                        expense_id=expense.id,
                        user_id=u.id,
                        amount_paid=float(p['amount'])
                    )
                    db.session.add(payer)
        except Exception as e:
            print("Error applying changes:", e)
            pass
            
    expense.status = 'Accepted'
    expense.pending_changes = None
    expense.change_requested_by = None
    
    log_activity(expense.id, user_id, 'change_approved')
    
    db.session.commit()
    return jsonify({"success": True, "data": expense.to_dict()}), 200

@direct_shared_bp.route('/<int:exp_id>/reject_change', methods=['POST'])
@require_auth
def reject_change(user_id, exp_id):
    user_id = int(user_id)
    data = request.json or {}
    
    expense = DirectSharedExpense.query.get(exp_id)
    if not expense or expense.status != 'Change_Pending':
        return jsonify({"success": False, "error": "Invalid request"}), 400
        
    participant = DirectSharedExpenseParticipant.query.filter_by(expense_id=exp_id, user_id=user_id).first()
    if not participant and expense.other_user_id != user_id:
        return jsonify({"success": False, "error": "Unauthorized"}), 403
        
    if expense.change_requested_by == user_id:
        return jsonify({"success": False, "error": "You cannot reject your own change request"}), 400
        
    if not data.get('reason') or not data['reason'].strip():
        return jsonify({"success": False, "error": "Please enter a reason for declining this change."}), 400
        
    expense.status = 'Accepted'
    expense.pending_changes = None
    expense.change_requested_by = None
    
    log_activity(expense.id, user_id, 'change_declined', reason=data['reason'].strip())
    
    db.session.commit()
    return jsonify({"success": True, "data": expense.to_dict()}), 200

@direct_shared_bp.route('/<int:exp_id>', methods=['DELETE'])
@require_auth
def delete_shared_expense(user_id, exp_id):
    user_id = int(user_id)
    expense = DirectSharedExpense.query.get(exp_id)
    if not expense:
        return jsonify({"success": False, "error": "Expense not found"}), 404
        
    if expense.creator_id != user_id:
        return jsonify({"success": False, "error": "Only the creator can delete this expense"}), 403
        
    db.session.delete(expense)
    db.session.commit()
    
    return jsonify({"success": True, "data": None}), 200
