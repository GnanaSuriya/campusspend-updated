import React, { useEffect, useState, useCallback } from 'react';
import { GlassCard } from '../components/ui';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, IndianRupee, TrendingDown, Target, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const fetchDashboard = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const executeReset = async () => {
    setIsResetting(true);
    try {
      await api.delete('/auth/reset');
      
      // Clear IndexedDB cache
      const req = indexedDB.deleteDatabase('CampusSpendDB');
      req.onsuccess = () => console.log("Local cache cleared");
      
      alert("Your CampusSpend data has been reset.");
      setShowResetModal(false);
      await fetchDashboard();
    } catch (err) {
      console.error("Failed to reset data:", err);
      alert("Could not reset your data. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  if (!data) return <div>Loading...</div>;

  const progress = data.budget > 0 ? Math.min((data.total_spent / data.budget) * 100, 100) : 0;
  const progressColor = progress > 90 ? 'bg-red-500' : progress > 70 ? 'bg-amber-500' : 'bg-mint-500';

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1">Welcome back, {user?.name}</p>
        </div>
        <button 
          onClick={() => setShowResetModal(true)}
          className="flex items-center gap-2 text-sm bg-red-500/10 text-red-700 px-4 py-2 rounded-xl hover:bg-red-500/20 font-bold transition-colors"
        >
          <RefreshCw size={16} /> Reset Data
        </button>
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
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
            <TrendingDown size={18} />
            <span>Spent</span>
          </div>
          <span className="text-4xl font-extrabold text-slate-800 dark:text-white">₹{data.total_spent.toFixed(2)}</span>
        </GlassCard>

        <GlassCard className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
            <Target size={18} />
            <span>Budget</span>
          </div>
          <span className="text-4xl font-extrabold text-slate-800 dark:text-white">
            {data.budget > 0 ? `₹${data.budget.toFixed(2)}` : 'Not Set'}
          </span>
        </GlassCard>

        <GlassCard className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
            <IndianRupee size={18} />
            <span>Remaining</span>
          </div>
          <span className={`text-4xl font-extrabold ${data.remaining <= 0 && data.budget > 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
            ₹{data.remaining.toFixed(2)}
          </span>
        </GlassCard>
      </div>

      {data.budget > 0 && (
        <GlassCard className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <span className="font-bold text-slate-700 dark:text-slate-200">Budget Usage</span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{progress.toFixed(1)}%</span>
          </div>
          <div className="h-4 w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full overflow-hidden">
            <div className={`h-full ${progressColor} transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }}></div>
          </div>
        </GlassCard>
      )}

      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard className="flex flex-col h-full">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Spending by Category</h3>
          {data.category_budgets && data.category_budgets.length > 0 ? (
            <div className="flex flex-col gap-5">
              {data.category_budgets.sort((a, b) => b.spent - a.spent).map(cat => (
                <div key={cat.name} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-700 dark:text-slate-200 font-bold">{cat.name}</span>
                    <span className="text-slate-900 dark:text-white">?{cat.spent.toFixed(2)}</span>
                  </div>
                  {cat.budget > 0 ? (
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 -mt-1">
                      <span>Budget: ?{cat.budget.toFixed(2)}</span>
                      <span className={cat.remaining < 0 ? 'text-red-500 font-bold' : ''}>
                        {cat.remaining < 0 ? `Exceeded by ?${Math.abs(cat.remaining).toFixed(2)}` : `?${cat.remaining.toFixed(2)} left`}
                      </span>
                    </div>
                  ) : null}
                  <div className="h-2 w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${cat.budget > 0 && cat.percentage_used > 100 ? 'bg-red-500' : 'bg-primary-500'}`} 
                      style={{ width: `${Math.min(cat.percentage_used || ((cat.spent / data.total_spent) * 100) || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 dark:text-slate-400 text-center py-8">No expenses this month yet.</div>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Recent Transactions</h3>
          {data.recent_transactions.length > 0 ? (
            <div className="flex flex-col gap-4">
              {data.recent_transactions.map((tx, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 transition-colors">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-white">{tx.category}</span>
                      {tx.is_shared && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-700">SHARED</span>
                      )}
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{tx.description || tx.payment_method}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-slate-800 dark:text-white">₹{tx.amount.toFixed(2)}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(tx.date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 dark:text-slate-400 text-center py-8">No recent transactions.</div>
          )}
        </GlassCard>
      </div>
{showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => !isResetting && setShowResetModal(false)} />
          <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-200">
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                <AlertCircle size={24} /> Reset all your CampusSpend data?
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                This will remove your budgets, expenses, and related financial data. Your account will not be deleted.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowResetModal(false)} 
                  disabled={isResetting}
                  className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeReset} 
                  disabled={isResetting}
                  className="px-4 py-2 font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition"
                >
                  {isResetting ? 'Resetting...' : 'Reset Data'}
                </button>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}



