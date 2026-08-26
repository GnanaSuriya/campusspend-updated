from flask import Blueprint, request, jsonify
from models import Group, GroupMember, User, SharedExpense, ExpenseSplit, Settlement
from database import db
from utils.auth import require_auth

groups_bp = Blueprint('groups', __name__)

@groups_bp.route('/groups', methods=['GET'])
@require_auth
def get_groups(user_id):
    memberships = GroupMember.query.filter_by(user_id=user_id).all()
    group_ids = [m.group_id for m in memberships]
    groups = Group.query.filter(Group.id.in_(group_ids)).all()
    
    return jsonify({
        "success": True,
        "data": [g.to_dict() for g in groups]
    }), 200

@groups_bp.route('/groups', methods=['POST'])
@require_auth
def create_group(user_id):
    data = request.json
    name = data.get('name')
    if not name:
        return jsonify({"success": False, "error": "Group name required"}), 400
        
    new_group = Group(name=name, created_by=user_id)
    db.session.add(new_group)
    db.session.flush() # get ID
    
    # Add creator as member
    member = GroupMember(group_id=new_group.id, user_id=user_id)
    db.session.add(member)
    db.session.commit()
    
    return jsonify({"success": True, "data": new_group.to_dict()}), 201

@groups_bp.route('/groups/<int:group_id>/members', methods=['POST'])
@require_auth
def add_member(user_id, group_id):
    data = request.json
    email = data.get('email')
    
    # check if user is in group
    if not GroupMember.query.filter_by(group_id=group_id, user_id=user_id).first():
        return jsonify({"success": False, "error": "Not in group"}), 403
        
    user_to_add = User.query.filter_by(email=email).first()
    if not user_to_add:
        return jsonify({"success": False, "error": "User not found"}), 404
        
    if GroupMember.query.filter_by(group_id=group_id, user_id=user_to_add.id).first():
        return jsonify({"success": False, "error": "Already in group"}), 400
        
    member = GroupMember(group_id=group_id, user_id=user_to_add.id)
    db.session.add(member)
    db.session.commit()
    
    return jsonify({"success": True, "data": member.to_dict()}), 201

@groups_bp.route('/shared-expenses', methods=['POST'])
@require_auth
def add_shared_expense(user_id):
    data = request.json
    group_id = data.get('group_id')
    amount = data.get('amount')
    description = data.get('description')
    splits = data.get('splits') # list of {user_id, amount_owed}
    
    if not all([group_id, amount, splits]):
        return jsonify({"success": False, "error": "Missing required fields"}), 400
        
    new_expense = SharedExpense(
        group_id=group_id,
        paid_by=user_id,
        amount=amount,
        description=description
    )
    db.session.add(new_expense)
    db.session.flush()
    
    for split in splits:
        es = ExpenseSplit(
            shared_expense_id=new_expense.id,
            user_id=split['user_id'],
            amount_owed=split['amount_owed']
        )
        db.session.add(es)
        
    db.session.commit()
    return jsonify({"success": True, "data": new_expense.to_dict()}), 201

@groups_bp.route('/settlements', methods=['GET'])
@require_auth
def get_settlements(user_id):
    # Calculate who owes whom based on shared expenses in groups the user belongs to
    memberships = GroupMember.query.filter_by(user_id=user_id).all()
    group_ids = [m.group_id for m in memberships]
    
    expenses = SharedExpense.query.filter(SharedExpense.group_id.in_(group_ids)).all()
    
    balances = {} # (payer, payee) -> amount
    for ex in expenses:
        for split in ex.splits:
            if split.user_id != ex.paid_by:
                key = (split.user_id, ex.paid_by)
                balances[key] = balances.get(key, 0) + split.amount_owed
                
    # Get recorded settlements to offset balances
    settlements = Settlement.query.filter(Settlement.group_id.in_(group_ids), Settlement.status == 'paid').all()
    for s in settlements:
        key = (s.payer_id, s.payee_id)
        if key in balances:
            balances[key] -= s.amount
            if balances[key] <= 0:
                del balances[key]
                
    result = []
    for (payer, payee), amount in balances.items():
        if payer == user_id or payee == user_id:
            payer_obj = User.query.get(payer)
            payee_obj = User.query.get(payee)
            result.append({
                "payer_id": payer,
                "payer_name": payer_obj.name,
                "payee_id": payee,
                "payee_name": payee_obj.name,
                "amount": amount
            })
            
    return jsonify({"success": True, "data": result}), 200

@groups_bp.route('/settlements', methods=['POST'])
@require_auth
def settle_up(user_id):
    data = request.json
    group_id = data.get('group_id')
    payee_id = data.get('payee_id')
    amount = data.get('amount')
    
    s = Settlement(
        group_id=group_id,
        payer_id=user_id,
        payee_id=payee_id,
        amount=amount,
        status='paid'
    )
    db.session.add(s)
    db.session.commit()
    return jsonify({"success": True, "data": s.to_dict()}), 201
