import React, { useState, useEffect } from 'react';
import { GlassCard, GlassButton } from '../components/ui';
import api from '../utils/api';
import { Lightbulb, TrendingUp, AlertTriangle, Target, RefreshCw, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Insights() {
  const [insights, setInsights] = useState(null);
  const [charts, setCharts] = useState({ weekly: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [outdated, setOutdated] = useState(false);

  const fetchCharts = async () => {
    try {
      const res = await api.get('/insights/charts');
      if (res.data.success) {
        setCharts(res.data.data);
      }
    } catch (e) {
      console.error("Failed to load charts");
    }
  };

  const fetchInsights = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/insights');
      if (res.data.success) {
        setInsights(res.data.data);
        setOutdated(false);
        localStorage.removeItem('campusspend_ai_outdated');
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error generating insights");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCharts();
    if (localStorage.getItem('campusspend_ai_outdated') === 'true') {
      setOutdated(true);
    } else {
      fetchInsights();
    }
    
    const interval = setInterval(() => {
      if (localStorage.getItem('campusspend_ai_outdated') === 'true' && !outdated) {
        setOutdated(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300">
            Spend Analytics & AI Insights
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Visual breakdowns and personalized AI financial advice.</p>
        </div>
        <GlassButton onClick={fetchInsights} disabled={loading} className="flex items-center gap-2 px-4 py-2">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          {loading ? "Analyzing..." : "Refresh Insights"}
        </GlassButton>
      </div>

      {outdated && !loading && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-500" />
            <p className="text-amber-800 dark:text-amber-200 font-medium">Your spending has changed! Refresh to update your AI insights.</p>
          </div>
          <GlassButton onClick={fetchInsights} className="bg-amber-500 hover:bg-amber-600">Refresh Now</GlassButton>
        </div>
      )}

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <GlassCard className="p-6 h-80">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="text-primary-500" />
            Monthly Spending
          </h2>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={charts.weekly}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `?${value}`} />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6 h-80">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <PieChartIcon className="text-mint-500" />
            Category Breakdown
          </h2>
          {charts.categories.length > 0 ? (
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie data={charts.categories} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {charts.categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `?${value}`} contentStyle={{ borderRadius: '8px', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">No data for this month.</div>
          )}
        </GlassCard>
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

      {insights && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Card - Spans full width on lg */}
          <GlassCard className="p-6 lg:col-span-3">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/50 rounded-xl text-primary-600 dark:text-primary-400">
                <Lightbulb size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Spending Overview</h3>
                <p className="text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{insights.summary}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="text-amber-500" size={20} />
              <h3 className="font-bold text-slate-800 dark:text-white">Biggest Expense</h3>
            </div>
            <div className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-500 mb-2">
              {insights.top_category.name}
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              ?{insights.top_category.amount} ({insights.top_category.percentage}% of spending)
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-500" size={20} />
              <h3 className="font-bold text-slate-800 dark:text-white">Watch Out</h3>
            </div>
            <ul className="space-y-3">
              {insights.warnings.map((warning, idx) => (
                <li key={idx} className="flex gap-2 text-slate-600 dark:text-slate-300 text-sm">
                  <span className="text-red-500 mt-1">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="text-mint-500" size={20} />
              <h3 className="font-bold text-slate-800 dark:text-white">Saving Opportunity</h3>
            </div>
            <div className="space-y-4">
              {insights.saving_suggestions.map((sug, idx) => (
                <div key={idx} className="bg-white/40 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{sug.category}</span>
                    <span className="text-mint-600 dark:text-mint-400 font-bold">-?{sug.suggested_reduction}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{sug.suggestion}</p>
                </div>
              ))}
            </div>
          </GlassCard>
          
          <GlassCard className="p-6 lg:col-span-3">
             <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="text-primary-500" size={20} />
              <h3 className="font-bold text-slate-800 dark:text-white">Actionable Recommendations</h3>
            </div>
            <ul className="space-y-3">
              {insights.recommendations.map((rec, idx) => (
                <li key={idx} className="flex gap-2 text-slate-600 dark:text-slate-300 text-sm">
                  <span className="text-primary-500 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
