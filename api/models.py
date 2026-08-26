from datetime import datetime
from database import db

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    student_type = db.Column(db.String(20), nullable=False) # 'Hosteller' or 'Day Scholar'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'student_type': self.student_type,
            'created_at': self.created_at.isoformat()
        }

class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(200))
    date = db.Column(db.DateTime, default=datetime.utcnow)
    payment_method = db.Column(db.String(50))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'amount': self.amount,
            'category': self.category,
            'description': self.description,
            'date': self.date.isoformat(),
            'payment_method': self.payment_method
        }

class Budget(db.Model):
    __tablename__ = 'budgets'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    category = db.Column(db.String(50), nullable=False) # 'Overall' or specific category
    amount = db.Column(db.Float, nullable=False)
    month_year = db.Column(db.String(7), nullable=False) # e.g. '2023-10'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'category': self.category,
            'amount': self.amount,
            'month_year': self.month_year
        }

class Alert(db.Model):
    __tablename__ = 'alerts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.String(200), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat()
        }

class Group(db.Model):
    __tablename__ = 'groups'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    members = db.relationship('GroupMember', backref='group', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat(),
            'members': [m.to_dict() for m in self.members]
        }

class GroupMember(db.Model):
    __tablename__ = 'group_members'
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None
        }

class SharedExpense(db.Model):
    __tablename__ = 'shared_expenses'
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=False)
    paid_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(200))
    date = db.Column(db.DateTime, default=datetime.utcnow)

    splits = db.relationship('ExpenseSplit', backref='shared_expense', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'paid_by': self.paid_by,
            'amount': self.amount,
            'description': self.description,
            'date': self.date.isoformat(),
            'splits': [s.to_dict() for s in self.splits]
        }

class ExpenseSplit(db.Model):
    __tablename__ = 'expense_splits'
    id = db.Column(db.Integer, primary_key=True)
    shared_expense_id = db.Column(db.Integer, db.ForeignKey('shared_expenses.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount_owed = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'shared_expense_id': self.shared_expense_id,
            'user_id': self.user_id,
            'amount_owed': self.amount_owed
        }

class Settlement(db.Model):
    __tablename__ = 'settlements'
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=False)
    payer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    payee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending') # 'pending' or 'paid'

    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'payer_id': self.payer_id,
            'payee_id': self.payee_id,
            'amount': self.amount,
            'status': self.status
        }

class DirectSharedExpense(db.Model):
    __tablename__ = 'direct_shared_expenses'
    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    other_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    other_user_email = db.Column(db.String(120), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    creator_percentage = db.Column(db.Float, nullable=False)
    other_percentage = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(200))
    category = db.Column(db.String(50))
    date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default='Pending') # Pending, Accepted, Declined, Change_Pending
    decline_reason = db.Column(db.String(250), nullable=True)
    pending_changes = db.Column(db.Text, nullable=True) # JSON string
    change_requested_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    creator = db.relationship('User', foreign_keys=[creator_id])
    other_user = db.relationship('User', foreign_keys=[other_user_id])
    changer = db.relationship('User', foreign_keys=[change_requested_by])
    activities = db.relationship('DirectSharedExpenseActivity', backref='shared_expense', cascade="all, delete-orphan", order_by="DirectSharedExpenseActivity.created_at.asc()")

    def to_dict(self):
        import json
        changes = None
        if self.pending_changes:
            try:
                changes = json.loads(self.pending_changes)
            except:
                pass
        return {
            'id': self.id,
            'creator_id': self.creator_id,
            'creator_name': self.creator.name if self.creator else None,
            'creator_email': self.creator.email if self.creator else None,
            'other_user_id': self.other_user_id,
            'other_user_name': self.other_user.name if self.other_user else None,
            'other_user_email': self.other_user_email,
            'total_amount': self.total_amount,
            'creator_percentage': self.creator_percentage,
            'other_percentage': self.other_percentage,
            'description': self.description,
            'category': self.category,
            'date': self.date.isoformat(),
            'status': self.status,
            'decline_reason': self.decline_reason,
            'pending_changes': changes,
            'change_requested_by': self.change_requested_by,
            'activities': [a.to_dict() for a in self.activities]
        }

class DirectSharedExpenseActivity(db.Model):
    __tablename__ = 'direct_shared_expense_activities'
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('direct_shared_expenses.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(50), nullable=False)
    details = db.Column(db.Text, nullable=True) # JSON string
    reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        import json
        details_obj = None
        if self.details:
            try:
                details_obj = json.loads(self.details)
            except:
                pass
        return {
            'id': self.id,
            'expense_id': self.expense_id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'action': self.action,
            'details': details_obj,
            'reason': self.reason,
            'created_at': self.created_at.isoformat()
        }
