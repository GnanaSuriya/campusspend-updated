from flask import Blueprint, request, jsonify
import bcrypt
from models import User
from database import db
from utils.auth import generate_token, require_auth

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    required_fields = ['name', 'email', 'password', 'student_type']
    if not all(k in data for k in required_fields):
        return jsonify({"success": False, "error": "Missing required fields"}), 400
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"success": False, "error": "Email already in use"}), 409
        
    if len(data['password']) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters"}), 400
        
    if data['student_type'] not in ['Hosteller', 'Day Scholar']:
        return jsonify({"success": False, "error": "Invalid student type"}), 400

    hashed_pw = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    new_user = User(
        name=data['name'],
        email=data['email'],
        password_hash=hashed_pw,
        student_type=data['student_type']
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    token = generate_token(new_user.id)
    return jsonify({
        "success": True,
        "data": {
            "token": token,
            "user": new_user.to_dict()
        }
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    if not data.get('email') or not data.get('password'):
        return jsonify({"success": False, "error": "Missing email or password"}), 400
        
    user = User.query.filter_by(email=data['email']).first()
    if not user:
        return jsonify({"success": False, "error": "Unknown email"}), 401
        
    if not bcrypt.checkpw(data['password'].encode('utf-8'), user.password_hash.encode('utf-8')):
        return jsonify({"success": False, "error": "Wrong password"}), 401
        
    token = generate_token(user.id)
    return jsonify({
        "success": True,
        "data": {
            "token": token,
            "user": user.to_dict()
        }
    }), 200

@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_me(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404
    return jsonify({"success": True, "data": user.to_dict()}), 200

@auth_bp.route('/me', methods=['PATCH'])
@require_auth
def update_me(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404
        
    data = request.json
    if 'name' in data:
        user.name = data['name']
    if 'student_type' in data and data['student_type'] in ['Hosteller', 'Day Scholar']:
        user.student_type = data['student_type']
    if 'password' in data and len(data['password']) >= 6:
        user.password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
    db.session.commit()
    return jsonify({"success": True, "data": user.to_dict()}), 200

@auth_bp.route('/reset', methods=['DELETE'])
@require_auth
def reset_data(user_id):
    data = request.json or {}
    password = data.get('password')
    
    if not password:
        return jsonify({"success": False, "error": "Invalid password."}), 401
        
    user = User.query.get(user_id)
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        return jsonify({"success": False, "error": "Invalid password."}), 401
        
    from models import (
        Transaction, Budget, DirectSharedExpense, Alert, 
        DirectSharedExpenseParticipant, DirectSharedExpensePayer,
        DirectSharedExpenseActivity, Group, GroupMember,
        SharedExpense, ExpenseSplit, Settlement
    )
    
    try:
        # 1. Delete basic financial data
        Transaction.query.filter_by(user_id=user_id).delete()
        Budget.query.filter_by(user_id=user_id).delete()
        Alert.query.filter_by(user_id=user_id).delete()
        
        # 2. Handle Legacy Group and Shared Expenses
        groups = Group.query.filter_by(created_by=user_id).all()
        for g in groups:
            # Manually delete dependent records without cascade
            Settlement.query.filter_by(group_id=g.id).delete()
            # SharedExpense splits are cascaded, but SharedExpense itself needs to be deleted
            expenses_in_group = SharedExpense.query.filter_by(group_id=g.id).all()
            for exp in expenses_in_group:
                db.session.delete(exp)
            db.session.delete(g) # cascades to GroupMember
            
        GroupMember.query.filter_by(user_id=user_id).delete()
        
        # Remove user from older settlements in other groups
        from sqlalchemy import or_
        Settlement.query.filter(or_(Settlement.payer_id == user_id, Settlement.payee_id == user_id)).delete()
        ExpenseSplit.query.filter_by(user_id=user_id).delete()
        
        # 3. Handle Direct Shared Expenses
        created_expenses = DirectSharedExpense.query.filter_by(creator_id=user_id).all()
        for e in created_expenses:
            db.session.delete(e) # This triggers ORM cascade for participants, payers, activities
            
        created_ids = [e.id for e in created_expenses]
        
        # Remove user as participant from other people's expenses
        if created_ids:
            my_participations = DirectSharedExpenseParticipant.query.filter(
                DirectSharedExpenseParticipant.user_id == user_id,
                DirectSharedExpenseParticipant.expense_id.notin_(created_ids)
            ).all()
            my_payments = DirectSharedExpensePayer.query.filter(
                DirectSharedExpensePayer.user_id == user_id,
                DirectSharedExpensePayer.expense_id.notin_(created_ids)
            ).all()
            my_activities = DirectSharedExpenseActivity.query.filter(
                DirectSharedExpenseActivity.user_id == user_id,
                DirectSharedExpenseActivity.expense_id.notin_(created_ids)
            ).all()
        else:
            my_participations = DirectSharedExpenseParticipant.query.filter_by(user_id=user_id).all()
            my_payments = DirectSharedExpensePayer.query.filter_by(user_id=user_id).all()
            my_activities = DirectSharedExpenseActivity.query.filter_by(user_id=user_id).all()
            
        for p in my_participations:
            db.session.delete(p)
        for p in my_payments:
            db.session.delete(p)
        for a in my_activities:
            db.session.delete(a)
        
        db.session.commit()
        return jsonify({"success": True, "data": None}), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error during reset for user {user_id}:\n{traceback.format_exc()}")
        return jsonify({"success": False, "error": f"Failed to reset data: {str(e)}"}), 500

@auth_bp.route('/search', methods=['GET'])
@require_auth
def search_user(user_id):
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify({"success": False, "error": "Query required"}), 400
        
    from sqlalchemy import or_, func
    user = User.query.filter(
        func.lower(User.name) == func.lower(q)
    ).first()
    if user:
        return jsonify({"success": True, "data": {"id": user.id, "name": user.name}}), 200
    return jsonify({"success": False, "error": "User not found"}), 404





