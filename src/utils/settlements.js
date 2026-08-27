/**
 * Calculates net balances for all users in a list of expenses.
 * Net Balance = Total Paid - Total Owed.
 * Positive balance = user is owed money (they paid more than their share).
 * Negative balance = user owes money (they paid less than their share).
 */
export function calculateBalances(expenses, currentUserId) {
  const balances = {}; // { userId: { name, netBalance, totalPaid, totalOwed } }

  expenses.forEach(exp => {
    // Only include Accepted expenses (for participants)
    
    // Process Payers (Amount Paid)
    // We assume if someone paid, it counts immediately towards their balance, 
    // but wait, if the expense is 'Pending' for everyone, should it count?
    // Let's only count expenses that aren't fully Declined. For simplicity, we count it.
    
    const isFullyDeclined = exp.status === 'Declined';
    if (isFullyDeclined) return;

    if (exp.payers && exp.payers.length > 0) {
      exp.payers.forEach(payer => {
        if (!balances[payer.user_id]) balances[payer.user_id] = { name: payer.user_name, netBalance: 0, totalPaid: 0, totalOwed: 0 };
        balances[payer.user_id].totalPaid += payer.amount_paid;
        balances[payer.user_id].netBalance += payer.amount_paid;
      });
    }

    if (exp.participants && exp.participants.length > 0) {
      exp.participants.forEach(part => {
        // Only count owed amount if Accepted.
        if (part.status === 'Accepted') {
          if (!balances[part.user_id]) balances[part.user_id] = { name: part.user_name, netBalance: 0, totalPaid: 0, totalOwed: 0 };
          balances[part.user_id].totalOwed += part.amount_owed;
          balances[part.user_id].netBalance -= part.amount_owed;
        }
      });
    }
  });

  return balances;
}

/**
 * Generates the minimum transaction path using a greedy algorithm.
 */
export function optimizeSettlements(balancesObj) {
  const debtors = [];
  const creditors = [];

  for (const userId in balancesObj) {
    const b = balancesObj[userId];
    if (b.netBalance < -0.01) debtors.push({ id: userId, name: b.name, amount: Math.abs(b.netBalance) });
    if (b.netBalance > 0.01) creditors.push({ id: userId, name: b.name, amount: b.netBalance });
  }

  // Sort by amount descending to minimize transactions
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0; // debtors index
  let j = 0; // creditors index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    const amount = Math.min(debtor.amount, creditor.amount);
    
    transactions.push({
      from: debtor.name,
      fromId: debtor.id,
      to: creditor.name,
      toId: creditor.id,
      amount: Number(amount.toFixed(2))
    });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return transactions;
}

export function calculateUniformSplit(total, count) {
  const base = Math.floor((total / count) * 100) / 100;
  const remainder = total - (base * count);
  const splits = Array(count).fill(base);
  // Add remainder to the first person
  splits[0] = Number((splits[0] + remainder).toFixed(2));
  return splits;
}
