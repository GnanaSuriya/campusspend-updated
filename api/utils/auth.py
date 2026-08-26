import os
import jwt
from functools import wraps
from flask import request, jsonify
from datetime import datetime, timedelta

def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, os.environ.get('JWT_SECRET', 'secret'), algorithm='HS256')

def decode_token(token):
    try:
        payload = jwt.decode(token, os.environ.get('JWT_SECRET', 'secret'), algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"success": False, "error": "Missing or invalid token"}), 401
        
        token = auth_header.split(' ')[1]
        user_id = decode_token(token)
        
        if not user_id:
            return jsonify({"success": False, "error": "Expired or invalid token"}), 401
            
        return f(user_id, *args, **kwargs)
    return decorated
