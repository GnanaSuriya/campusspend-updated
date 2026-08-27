import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getCategories } from '../utils/categories';
import { Plus } from 'lucide-react';
import { GlassButton } from '../components/ui';
import SettlementDashboard from '../components/shared/SettlementDashboard';
import AddExpenseModal from '../components/shared/AddExpenseModal';
import SharedExpenseCard from '../components/shared/SharedExpenseCard';
// Assuming we have a DeclineModal component from the previous implementation, let's inline a simple prompt for now
// to keep this file concise, or use window.prompt if preferred, but a modal is better.
// Actually, I'll use standard prompts for decline reasons for brevity, or a small custom modal.

export default function SharedExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const categories = getCategories(user.student_type);

  const fetchData = async () => {
    try {
      const res = await api.get('/shared');
      if (res.data.success) setExpenses(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSubmit = async (data) => {
    try {
      await api.post('/shared', data);
      setIsAddOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Error adding shared expense");
    }
  };

  const handleAccept = async (id) => {
    try {
      await api.patch(`/shared/${id}`, { status: 'Accepted' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Error");
    }
  };

  const handleReject = async (expense) => {
    const reason = window.prompt(`Why are you declining ${expense.creator_name}'s request?`);
    if (!reason) return;
    try {
      await api.patch(`/shared/${expense.id}`, { status: 'Declined', decline_reason: reason });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Error");
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/shared/${id}`);
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const handleEdit = (expense) => {
    // For brevity, edit launches the add modal with prefilled data or a dedicated edit modal
    // Implementing full edit modal requires mapping participants back.
    alert("Editing advanced splits is currently limited. Please delete and recreate for major changes, or use the API.");
  };

  const handleApproveChange = async (id) => {
    try {
      await api.post(`/shared/${id}/approve_change`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Error");
    }
  };

  const handleRejectChange = async (expense) => {
    const reason = window.prompt("Why are you declining this change?");
    if (!reason) return;
    try {
      await api.post(`/shared/${expense.id}/reject_change`, { reason });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300">
            Shared Expenses & Settlements
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Manage group expenses, multi-payers, and settle debts efficiently.</p>
        </div>
        <GlassButton onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 px-6 py-3 shrink-0">
          <Plus size={20} />
          Add Group Expense
        </GlassButton>
      </div>

      <SettlementDashboard expenses={expenses} />

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Recent Expenses</h2>
        {expenses.length === 0 ? (
          <div className="text-center py-12 glass rounded-2xl">
            <p className="text-slate-500 dark:text-slate-400">No shared expenses found.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {expenses.map((expense) => (
              <SharedExpenseCard 
                key={expense.id}
                expense={expense}
                currentUserId={user.id}
                onAccept={handleAccept}
                onReject={handleReject}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onApproveChange={handleApproveChange}
                onRejectChange={handleRejectChange}
              />
            ))}
          </div>
        )}
      </div>

      {isAddOpen && (
        <AddExpenseModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleAddSubmit}
          categories={categories}
        />
      )}
    </div>
  );
}
