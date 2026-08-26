import React, { useState, useEffect } from 'react';
import { GlassCard, GlassButton } from '../components/ui';
import api from '../utils/api';
import { Lightbulb, AlertTriangle, TrendingDown, Target, Wallet } from 'lucide-react';

export default function Insights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [outdated, setOutdated] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    setOutdated(false);
    try {
      const res = await api.post('/insights');
      if (res.data.success) {
        setInsights(res.data.data);
        localStorage.setItem('campusspend_ai_insights', JSON.stringify(res.data.data));
        localStorage.setItem('campusspend_ai_outdated', 'false');
      }
    } catch (err) {
      setError(err.response?.data?.error || "Insights are temporarily unavailable. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if outdated
    const isOutdated = localStorage.getItem('campusspend_ai_outdated') === 'true';
    setOutdated(isOutdated);
    
    // Load from cache
    const cached = localStorage.getItem('campusspend_ai_insights');
    if (cached) {
      try {
        setInsights(JSON.parse(cached));
      } catch (e) {
        fetchInsights();
      }
    } else {
      fetchInsights();
    }
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">AI Insights</h1>
          <p className="text-slate-600 mt-1">Smart analysis of your real spending habits</p>
        </div>
        <GlassButton onClick={fetchInsights} disabled={loading} className="whitespace-nowrap">
          {loading ? 'Analyzing...' : 'Refresh Insights'}
        </GlassButton>
      </header>

      {outdated && insights && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 p-4 rounded-xl flex justify-between items-center">
          <span>Your spending changed.</span>
          <button onClick={fetchInsights} className="text-sm font-bold underline hover:text-amber-800">Refresh Insights</button>
        </div>
      )}

      {loading && !insights ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <GlassCard className="p-8 text-center bg-red-500/10 border-red-500/20">
          <AlertTriangle className="mx-auto mb-4 text-red-500" size={32} />
          <h3 className="text-lg font-bold text-slate-800 mb-2">{error.includes('No spending') ? 'No spending data yet.' : 'Insights Unavailable'}</h3>
          <p className="text-slate-600">{error}</p>
        </GlassCard>
      ) : insights ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Spending Overview */}
          <GlassCard className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-primary-700">
              <Wallet size={20} />
              <h2 className="text-lg font-bold">Spending Overview</h2>
            </div>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{insights.summary}</p>
          </GlassCard>

          {/* Card 2: Biggest Expense */}
          <GlassCard className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-rose-600">
              <TrendingDown size={20} />
              <h2 className="text-lg font-bold">Biggest Expense</h2>
            </div>
            {insights.top_category && (
              <div>
                <h3 className="text-2xl font-extrabold text-slate-800">{insights.top_category.name}</h3>
                <p className="text-slate-600 mt-1">?{insights.top_category.amount} spent</p>
                <p className="text-sm text-slate-500">{insights.top_category.percentage}% of your total spending.</p>
              </div>
            )}
          </GlassCard>

          {/* Card 3: Watch Out */}
          {insights.warnings && insights.warnings.length > 0 && (
            <GlassCard className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle size={20} />
                <h2 className="text-lg font-bold">Watch Out</h2>
              </div>
              <ul className="flex flex-col gap-2">
                {insights.warnings.map((w, i) => (
                  <li key={i} className="text-slate-700 bg-amber-500/10 p-3 rounded-lg text-sm">{w}</li>
                ))}
              </ul>
            </GlassCard>
          )}

          {/* Card 4: Saving Opportunity */}
          {insights.saving_suggestions && insights.saving_suggestions.length > 0 && (
            <GlassCard className="flex flex-col gap-4 md:col-span-2">
              <div className="flex items-center gap-2 text-mint-600">
                <Target size={20} />
                <h2 className="text-lg font-bold">Saving Opportunity</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.saving_suggestions.map((s, i) => (
                  <div key={i} className="bg-white/40 p-4 rounded-xl border border-white/60 flex flex-col gap-2">
                    <p className="text-slate-700 font-medium">{s.suggestion}</p>
                    <div className="mt-2 text-mint-700 font-bold bg-mint-500/10 self-start px-3 py-1 rounded-full text-sm">
                      Potential saving: ?{s.suggested_reduction}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Card 5: Recommendation */}
          {insights.recommendations && insights.recommendations.length > 0 && (
            <GlassCard className="flex flex-col gap-4 md:col-span-2">
              <div className="flex items-center gap-2 text-blue-600">
                <Lightbulb size={20} />
                <h2 className="text-lg font-bold">Recommendation</h2>
              </div>
              <ul className="flex flex-col gap-3">
                {insights.recommendations.map((r, i) => (
                  <li key={i} className="text-slate-700">{r}</li>
                ))}
              </ul>
            </GlassCard>
          )}
          
        </div>
      ) : null}
    </div>
  );
}
