import React, { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassInput, GlassModal } from '../components/ui';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getCategories } from '../utils/categories';
import { Target, AlertCircle } from 'lucide-react';

export default function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const categories = ['Overall', ...getCategories(user.student_type)];
  
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [formData, setFormData] = useState({ category: 'Overall', amount: '', month_year: currentMonth });

  const fetchData = async () => {
    try {
      const [budRes, alertRes] = await Promise.all([
        api.get(`/budgets?month_year=${currentMonth}`),
        api.get('/budgets/alerts')
      ]);
      if (budRes.data.success) setBudgets(budRes.data.data);
      if (alertRes.data.success) setAlerts(alertRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/budgets', formData);
      if (res.data.success) {
        setIsModalOpen(false);
        fetchData();
        setFormData({ ...formData, amount: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Budgets</h1>
          <p className="text-slate-600 mt-1">Set limits and get alerts</p>
        </div>
        <GlassButton onClick={() => setIsModalOpen(true)}>
          <Target size={20} /> Set Budget
        </GlassButton>
      </header>

      {alerts.length > 0 && (
        <div className="flex flex-col gap-3">
          {alerts.map((alert, i) => (
            <div key={i} className={`p-4 rounded-xl flex items-center gap-3 backdrop-blur-md border ${alert.type === 'exceeded' ? 'bg-red-500/10 border-red-500/20 text-red-700' : 'bg-amber-500/10 border-amber-500/20 text-amber-700'}`}>
              <AlertCircle size={20} />
              <span className="font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.length > 0 ? budgets.map(b => (
          <GlassCard key={b.id} className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{b.category} Budget</h3>
              <span className="text-2xl font-extrabold text-primary-600">₹{b.amount.toFixed(2)}</span>
            </div>
            <div className="text-sm text-slate-500 text-right">For {b.month_year}</div>
          </GlassCard>
        )) : (
          <div className="col-span-full py-12 text-center text-slate-500">
            No budgets set for this month.
          </div>
        )}
      </div>

      <GlassModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Set Budget limit">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <select 
            name="category" 
            value={formData.category} 
            onChange={(e) => setFormData({...formData, category: e.target.value})} 
            className="w-full px-4 py-3 rounded-xl glass-input text-slate-800"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          
          <GlassInput 
            type="number" 
            name="amount" 
            placeholder="Budget Amount (₹)" 
            value={formData.amount} 
            onChange={(e) => setFormData({...formData, amount: e.target.value})} 
            required 
            min="0" step="1"
          />
          
          <GlassInput 
            type="month" 
            name="month_year" 
            value={formData.month_year} 
            onChange={(e) => setFormData({...formData, month_year: e.target.value})} 
            required 
          />
          
          <GlassButton type="submit" className="mt-2">
            Save Budget
          </GlassButton>
        </form>
      </GlassModal>
    </div>
  );
}
