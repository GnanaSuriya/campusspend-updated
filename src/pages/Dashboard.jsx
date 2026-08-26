import React, { useEffect, useState } from 'react';
import { GlassCard } from '../components/ui';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, IndianRupee, TrendingDown, Target } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, alertsRes] = await Promise.all([
          api.get('/transactions/dashboard'),
          api.get('/budgets/alerts')
        ]);
        if (dashRes.data.success) setData(dashRes.data.data);
        if (alertsRes.data.success) setAlerts(alertsRes.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDashboard();
  }, []);

  if (!data) return <div>Loading...</div>;

  const progress = data.budget > 0 ? Math.min((data.total_spent / data.budget) * 100, 100) : 0;
  const progressColor = progress > 90 ? 'bg-red-500' : progress > 70 ? 'bg-amber-500' : 'bg-mint-500';

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-extrabold text-slate-800">Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome back, {user?.name}</p>
      </header>

      {data?.pending_requests_count > 0 && (
        <div className="bg-primary-500/10 border border-primary-500/20 text-primary-800 px-4 py-3 rounded-xl flex items-center justify-between">
          <span className="font-medium text-sm">🔔 You have {data.pending_requests_count} pending shared expense request{data.pending_requests_count > 1 ? 's' : ''}!</span>
          <button 
            onClick={() => window.location.href='/shared-expenses'} 
            className="text-xs font-bold bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Review
          </button>
        </div>
      )}

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <TrendingDown size={18} />
            <span>Spent this Month</span>
          </div>
          <span className="text-4xl font-extrabold text-slate-800">₹{data.total_spent.toFixed(2)}</span>
        </GlassCard>

        <GlassCard className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Target size={18} />
            <span>Monthly Budget</span>
          </div>
          <span className="text-4xl font-extrabold text-slate-800">
            {data.budget > 0 ? `₹${data.budget.toFixed(2)}` : 'Not Set'}
          </span>
        </GlassCard>

        <GlassCard className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <IndianRupee size={18} />
            <span>Remaining</span>
          </div>
          <span className={`text-4xl font-extrabold ${data.remaining <= 0 && data.budget > 0 ? 'text-red-500' : 'text-slate-800'}`}>
            ₹{data.remaining.toFixed(2)}
          </span>
        </GlassCard>
      </div>

      {data.budget > 0 && (
        <GlassCard className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <span className="font-bold text-slate-700">Budget Usage</span>
            <span className="text-sm font-medium text-slate-500">{progress.toFixed(1)}%</span>
          </div>
          <div className="h-4 w-full bg-slate-200/50 rounded-full overflow-hidden">
            <div className={`h-full ${progressColor} transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }}></div>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard>
          <h3 className="text-lg font-bold text-slate-800 mb-6">Spending by Category</h3>
          {data.category_breakdown.length > 0 ? (
            <div className="flex flex-col gap-4">
              {data.category_breakdown.sort((a, b) => b.amount - a.amount).map(cat => (
                <div key={cat.category} className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-700">{cat.category}</span>
                    <span className="text-slate-900">₹{cat.amount.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-500" 
                      style={{ width: `${(cat.amount / data.total_spent) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-center py-8">No expenses this month yet.</div>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-bold text-slate-800 mb-6">Recent Transactions</h3>
          {data.recent_transactions.length > 0 ? (
            <div className="flex flex-col gap-4">
              {data.recent_transactions.map((tx, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/40 transition-colors">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{tx.category}</span>
                      {tx.is_shared && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-700">SHARED</span>
                      )}
                    </div>
                    <span className="text-sm text-slate-500">{tx.description || tx.payment_method}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-slate-800">₹{tx.amount.toFixed(2)}</span>
                    <span className="text-xs text-slate-400">{new Date(tx.date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-center py-8">No recent transactions.</div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
