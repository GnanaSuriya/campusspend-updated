import React, { useState, useEffect } from 'react';
import { GlassCard, GlassButton } from '../components/ui';
import api from '../utils/api';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchInsights = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/insights');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error generating insights");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300">
            AI Spending Insights
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Personalized AI financial advice based on your verified spending.</p>
        </div>
        <GlassButton onClick={fetchInsights} disabled={loading} className="flex items-center gap-2 px-4 py-2">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          {loading ? "Analyzing..." : "Refresh Insights"}
        </GlassButton>
      </div>

      {error && (
        <div className="glass p-6 rounded-2xl bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 flex items-start gap-4">
          <AlertTriangle className="text-red-500 shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-red-800 dark:text-red-300">Analysis Failed</h3>
            <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {data && data.financials && (
        <div className="space-y-8">
          
          {/* Monthly Spending Overview */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
              Monthly Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Monthly Spending</p>
                <p className="text-3xl font-black text-slate-800 dark:text-white">₹{data.financials.total_spent.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Budget</p>
                <p className="text-3xl font-black text-slate-800 dark:text-white">₹{data.financials.total_budget.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Remaining</p>
                <p className={`text-3xl font-black ${data.financials.remaining < 0 ? 'text-red-500' : 'text-mint-500'}`}>
                  ₹{data.financials.remaining.toFixed(2)}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Category Breakdown */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
              Category Breakdown
            </h2>
            {data.financials.total_spent === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No spending recorded this month.</p>
            ) : (
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                
                {/* CSS Donut Chart */}
                <div className="relative w-48 h-48 shrink-0 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner" style={{
                  background: `conic-gradient(${
                    (() => {
                      let currentAngle = 0;
                      const sortedCats = data.financials.categories
                        .filter(c => c.spent > 0)
                        .sort((a, b) => b.spent - a.spent);
                        
                      // Tailwind colors mapped roughly
                      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
                      
                      return sortedCats.map((c, i) => {
                        const perc = (c.spent / data.financials.total_spent) * 100;
                        const start = currentAngle;
                        currentAngle += perc;
                        return `${colors[i % colors.length]} ${start}% ${currentAngle}%`;
                      }).join(', ')
                    })()
                  })`
                }}>
                  {/* Inner cutout for donut shape */}
                  <div className="absolute w-36 h-36 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-[inset_0px_2px_4px_rgba(0,0,0,0.1)]">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Total</span>
                    <span className="text-xl font-black text-slate-800 dark:text-white">₹{data.financials.total_spent.toFixed(0)}</span>
                  </div>
                </div>

                {/* Category List with Progress Bars */}
                <div className="flex-1 w-full space-y-4">
                  {data.financials.categories
                    .filter(c => c.spent > 0)
                    .sort((a, b) => b.spent - a.spent)
                    .map((c, idx) => {
                      const percentage = ((c.spent / data.financials.total_spent) * 100).toFixed(1);
                      const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-red-500', 'bg-violet-500', 'bg-slate-500'];
                      const bgClass = colors[idx % colors.length];
                      
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-sm font-medium">
                            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${bgClass}`}></span>
                              {c.name}
                            </span>
                            <div className="flex gap-4">
                              <span className="text-slate-800 dark:text-white font-bold">₹{c.spent.toFixed(2)}</span>
                              <span className="text-slate-500 dark:text-slate-400 w-12 text-right">{percentage}%</span>
                            </div>
                          </div>
                          {/* Progress Bar */}
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${bgClass} rounded-full`} style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </GlassCard>

          {/* AI Insights Section */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
              AI Insights
            </h2>
            
            {data.financials.total_spent === 0 ? (
              <p className="text-slate-700 dark:text-slate-300 text-lg">Great — you haven't recorded any spending this month.</p>
            ) : data.ai_error ? (
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl">
                <AlertTriangle size={20} />
                <p className="font-medium">{data.ai_error}</p>
              </div>
            ) : data.ai ? (
              <div className="space-y-8">
                <p className="text-lg text-slate-700 dark:text-slate-300 font-medium">
                  {data.ai.summary}
                </p>

                {data.ai.insights && data.ai.insights.length > 0 && (
                  <div className="space-y-4">
                    {data.ai.insights.map((insight, idx) => (
                      <div key={idx} className="bg-white/40 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
                          <span>🔴</span> {insight.title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 ml-7">
                          {insight.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {data.ai.suggestions && data.ai.suggestions.length > 0 && (
                  <div className="space-y-4">
                    {data.ai.suggestions.map((suggestion, idx) => (
                      <div key={idx} className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-xl border border-primary-100 dark:border-primary-900/30">
                        <h3 className="font-bold text-primary-800 dark:text-primary-300 flex items-center gap-2 mb-2">
                          <span>💡</span> Suggestion
                        </h3>
                        <p className="text-primary-700 dark:text-primary-400 ml-7">
                          {suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500">Loading AI insights...</p>
            )}
          </GlassCard>

        </div>
      )}
    </div>
  );
}
