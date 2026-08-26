import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui';
import api from '../utils/api';
import { Lightbulb, TrendingUp } from 'lucide-react';

export default function Insights() {
  const [insights, setInsights] = useState([]);
  const [predictions, setPredictions] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const [iRes, pRes] = await Promise.all([
          api.get('/insights'),
          api.get('/predictions')
        ]);
        if (iRes.data.success) setInsights(iRes.data.data);
        if (pRes.data.success) setPredictions(pRes.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchInsights();
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-extrabold text-slate-800">Insights</h1>
        <p className="text-slate-600 mt-1">Smart analysis of your spending habits</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <GlassCard className="flex flex-col gap-6">
          <div className="flex items-center gap-3 text-primary-700 mb-2">
            <Lightbulb size={24} />
            <h2 className="text-xl font-bold">Spending Insights</h2>
          </div>
          
          {insights.length > 0 ? (
            <div className="flex flex-col gap-4">
              {insights.map((insight, i) => (
                <div key={i} className="p-4 bg-white/40 rounded-xl border border-white/60">
                  <p className="text-slate-800 font-medium">{insight}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-4">Not enough data to generate insights yet.</p>
          )}
        </GlassCard>

        <GlassCard className="flex flex-col gap-6">
          <div className="flex items-center gap-3 text-mint-600 mb-2">
            <TrendingUp size={24} />
            <h2 className="text-xl font-bold">Month-End Prediction</h2>
          </div>
          
          {predictions ? (
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <span className="text-slate-500 font-medium text-sm">Predicted Total Spend (End of Month)</span>
                <span className="text-4xl font-extrabold text-slate-800">₹{predictions.predicted_spend.toFixed(2)}</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-slate-500 font-medium text-sm">Current Daily Average</span>
                <span className="text-2xl font-bold text-slate-700">₹{predictions.daily_average.toFixed(2)} / day</span>
              </div>
              <p className="text-sm text-slate-500 italic mt-4">
                *Prediction is based on a simple linear projection of your daily average spending so far this month.
              </p>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-4">Loading predictions...</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
