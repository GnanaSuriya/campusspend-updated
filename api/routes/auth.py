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
