import os
import sys
import uuid
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))
import json
from index import app
from models import db, User, DirectSettlement

def test_it():
    with app.app_context():
        client = app.test_client()
        suriya_email = f"suriya_{uuid.uuid4()}@example.com"
        sowmyen_email = f"sowmyen_{uuid.uuid4()}@example.com"
        
        res = client.post("/api/auth/register", json={"name": "Suriya", "email": suriya_email, "password": "password", "student_type": "Hosteller"})
        suriya_id = res.json["data"]["user"]["id"]
        suriya_token = res.json["data"]["token"]
        
        res = client.post("/api/auth/register", json={"name": "Sowmyen", "email": sowmyen_email, "password": "password", "student_type": "Hosteller"})
        sowmyen_id = res.json["data"]["user"]["id"]
        sowmyen_token = res.json["data"]["token"]

        res = client.post("/api/shared", json={
            "total_amount": 1500,
            "description": "Lunch",
            "category": "Food",
            "split_mode": "Percentage",
            "participants": [
                {"user_id": suriya_id, "user_name": "Suriya", "amount": 450, "percentage": 30},
                {"user_id": sowmyen_id, "user_name": "Sowmyen", "amount": 1050, "percentage": 70}
            ],
            "payers": [
                {"user_id": suriya_id, "user_name": "Suriya", "amount": 1000},
                {"user_id": sowmyen_id, "user_name": "Sowmyen", "amount": 500}
            ]
        }, headers={"Authorization": f"Bearer {suriya_token}"})
        
        expense_id = res.json["data"]["id"]
        
        dash1 = client.get("/api/transactions/dashboard", headers={"Authorization": f"Bearer {suriya_token}"})
        dash2 = client.get("/api/transactions/dashboard", headers={"Authorization": f"Bearer {sowmyen_token}"})
        print("Before accept Suriya spent:", dash1.json["data"]["total_spent"])
        print("Before accept Sowmyen spent:", dash2.json["data"]["total_spent"])

        client.patch(f"/api/shared/{expense_id}", json={"status": "Accepted"}, headers={"Authorization": f"Bearer {sowmyen_token}"})
        
        settlements = DirectSettlement.query.filter_by(expense_id=expense_id).all()
        for s in settlements:
            print(f"Settlement: {s.debtor.name} -> {s.creditor.name} = {s.amount}")
            
        dash1 = client.get("/api/transactions/dashboard", headers={"Authorization": f"Bearer {suriya_token}"})
        dash2 = client.get("/api/transactions/dashboard", headers={"Authorization": f"Bearer {sowmyen_token}"})
        print("After accept Suriya spent:", dash1.json["data"]["total_spent"])
        print("After accept Sowmyen spent:", dash2.json["data"]["total_spent"])

test_it()
