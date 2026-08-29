from sqlalchemy import extract, or_
from models import Transaction, DirectSharedExpense, DirectSharedExpenseParticipant, Budget, DirectSharedExpensePayer, DirectSettlement
import json

def get_effective_user_spending(user_id, month=None, year=None):
    """
    Returns total spent and a dictionary of category spending for the user.
    Uses the strict single-source-of-truth rules with explicit settlements.
    """
    query = Transaction.query.filter(Transaction.user_id == user_id)
    if month and year:
        query = query.filter(extract('month', Transaction.date) == month, extract('year', Transaction.date) == year)
    
    personal_tx = query.all()
    
    # Get all participant records for this user
    participants = DirectSharedExpenseParticipant.query.filter(
        DirectSharedExpenseParticipant.user_id == user_id
    ).all()
    
    cat_spent = {}
    total_spent = 0.0
    
    for t in personal_tx:
        total_spent += t.amount
        cat_spent[t.category] = cat_spent.get(t.category, 0.0) + t.amount
        
    for p in participants:
        ex = p.shared_expense
        # Filter by month/year if provided
        if month and year:
            if ex.date.month != month or ex.date.year != year:
                continue
                
        # If Pending, do absolutely nothing (skip)
        
        has_settlements = DirectSettlement.query.filter_by(expense_id=ex.id).first() is not None

        if ex.status == 'Completed' or has_settlements:
            # Budget is handled entirely by amount_paid + Settlement transactions
            payer_record = DirectSharedExpensePayer.query.filter_by(expense_id=ex.id, user_id=user_id).first()
            if payer_record:
                amount = payer_record.amount_paid
                total_spent += amount
                cat = ex.category or 'Other'
                cat_spent[cat] = cat_spent.get(cat, 0.0) + amount
                
            # Add settlements paid (user is debtor)
            settlements_paid = DirectSettlement.query.filter_by(expense_id=ex.id, debtor_id=user_id).all()
            for s in settlements_paid:
                total_spent += s.amount
                cat = ex.category or 'Other'
                cat_spent[cat] = cat_spent.get(cat, 0.0) + s.amount
                
            # Subtract settlements received (user is creditor)
            settlements_received = DirectSettlement.query.filter_by(expense_id=ex.id, creditor_id=user_id).all()
            for s in settlements_received:
                total_spent -= s.amount
                cat = ex.category or 'Other'
                cat_spent[cat] = cat_spent.get(cat, 0.0) - s.amount
                
        elif ex.status == 'Accepted' or p.status == 'Accepted':
            # Old logic for legacy Accepted expenses that have no settlement transactions
            amount = p.amount_owed
            total_spent += amount
            cat = ex.category or 'Other'
            cat_spent[cat] = cat_spent.get(cat, 0.0) + amount

    return total_spent, cat_spent

def get_budget_summary(user_id, month, year):
    month_year_str = f"{year}-{month:02d}"
    budgets = Budget.query.filter_by(user_id=user_id, month_year=month_year_str).all()
    
    total_spent, cat_spent = get_effective_user_spending(user_id, month, year)
    
    overall_budget = sum(b.amount for b in budgets)
    remaining = overall_budget - total_spent
    percentage_used = round((total_spent / overall_budget * 100) if overall_budget > 0 else 0, 1)
    
    categories_data = []
    budgeted_cats = set()
    
    for b in budgets:
        if b.category != 'Overall':
            budgeted_cats.add(b.category)
            spent = cat_spent.get(b.category, 0)
            categories_data.append({
                "name": b.category,
                "budget": b.amount,
                "spent": round(spent, 2),
                "remaining": round(b.amount - spent, 2),
                "percentage_used": round((spent / b.amount * 100) if b.amount > 0 else 0, 1)
            })
            
    # Include unbudgeted categories that have spending
    for cat, spent in cat_spent.items():
        if cat not in budgeted_cats and spent > 0:
            categories_data.append({
                "name": cat,
                "budget": 0,
                "spent": round(spent, 2),
                "remaining": -round(spent, 2),
                "percentage_used": 100
            })
            
    return {
        "total_budget": overall_budget,
        "total_spent": round(total_spent, 2),
        "remaining": round(remaining, 2),
        "percentage_used": percentage_used,
        "categories": categories_data
    }
