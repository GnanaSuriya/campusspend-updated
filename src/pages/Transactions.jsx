import React, { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassInput, GlassModal } from '../components/ui';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getCategories } from '../utils/categories';
import { Plus, Trash2 } from 'lucide-react';

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const categories = getCategories(user.student_type);

  const [formData, setFormData] = useState({
    amount: '', category: categories[0], description: '', date: new Date().toISOString().split('T')[0], payment_method: 'UPI'
  });

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/transactions');
      if (res.data.success) {
        setTransactions(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/transactions', formData);
      if (res.data.success) {
        setIsModalOpen(false);
        fetchTransactions();
        setFormData({ amount: '', category: categories[0], description: '', date: new Date().toISOString().split('T')[0], payment_method: 'UPI' });
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this transaction?')) {
      try {
        await api.delete(`/transactions/${id}`);
        fetchTransactions();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Transactions</h1>
          <p className="text-slate-600 mt-1">Manage your expenses</p>
        </div>
        <GlassButton onClick={() => setIsModalOpen(true)}>
          <Plus size={20} /> Add Expense
        </GlassButton>
      </header>

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/20 border-b border-white/40">
                <th className="p-4 font-bold text-slate-700">Date</th>
                <th className="p-4 font-bold text-slate-700">Category</th>
                <th className="p-4 font-bold text-slate-700">Description</th>
                <th className="p-4 font-bold text-slate-700">Method</th>
                <th className="p-4 font-bold text-slate-700 text-right">Amount</th>
                <th className="p-4 font-bold text-slate-700 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} className="border-b border-white/20 hover:bg-white/30 transition-colors">
                  <td className="p-4 text-slate-600">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="p-4 font-medium text-slate-800">{tx.category}</td>
                  <td className="p-4 text-slate-600">{tx.description || '-'}</td>
                  <td className="p-4 text-slate-600">{tx.payment_method || '-'}</td>
                  <td className="p-4 font-bold text-slate-800 text-right">₹{tx.amount.toFixed(2)}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleDelete(tx.id)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">No transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Expense">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-4">
            <GlassInput 
              type="number" 
              name="amount" 
              placeholder="Amount (₹)" 
              value={formData.amount} 
              onChange={handleChange} 
              required 
              min="0" step="0.01"
            />
            <GlassInput 
              type="date" 
              name="date" 
              value={formData.date} 
              onChange={handleChange} 
              required 
            />
          </div>
          
          <select 
            name="category" 
            value={formData.category} 
            onChange={handleChange} 
            className="w-full px-4 py-3 rounded-xl glass-input text-slate-800"
            required
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          
          <GlassInput 
            name="description" 
            placeholder="Description (Optional)" 
            value={formData.description} 
            onChange={handleChange} 
          />
          
          <select 
            name="payment_method" 
            value={formData.payment_method} 
            onChange={handleChange} 
            className="w-full px-4 py-3 rounded-xl glass-input text-slate-800"
          >
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Net Banking">Net Banking</option>
          </select>
          
          <GlassButton type="submit" className="mt-2" disabled={loading}>
            {loading ? 'Adding...' : 'Save Expense'}
          </GlassButton>
        </form>
      </GlassModal>
    </div>
  );
}
