import React from 'react';
import { GlassCard } from '../ui';
import { calculateBalances, optimizeSettlements } from '../../utils/settlements';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Wallet, UserCircle, CheckCircle2 } from 'lucide-react';

export default function SettlementDashboard({ expenses }) {
  const { user } = useAuth();
  
  const balances = calculateBalances(expenses, user.id);
  const myBalance = balances[user.id] || { netBalance: 0, totalPaid: 0, totalOwed: 0 };
  const settlements = optimizeSettlements(balances);
  
  const totalYouPaid = myBalance.totalPaid;
  const totalYouOwe = myBalance.totalOwed;
  
  // Owe vs Owed
  // If my netBalance is positive, others owe me.
  // If my netBalance is negative, I owe others.
  const youOwe = myBalance.netBalance < 0 ? Math.abs(myBalance.netBalance) : 0;
  const othersOweYou = myBalance.netBalance > 0 ? myBalance.netBalance : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <GlassCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
          <Wallet className="text-primary-500" />
          Aggregated Balances
        </h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700/50">
            <span className="text-slate-600 dark:text-slate-400">Total You Paid (Overall)</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">?{totalYouPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700/50">
            <span className="text-slate-600 dark:text-slate-400">Total Your Share (Owed)</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">?{totalYouOwe.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700/50">
            <span className="text-slate-600 dark:text-slate-400">You Owe Others</span>
            <span className="font-bold text-red-500">?{youOwe.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700/50">
            <span className="text-slate-600 dark:text-slate-400">Others Owe You</span>
            <span className="font-bold text-mint-500">?{othersOweYou.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="font-bold text-lg text-slate-800 dark:text-white">Net Balance</span>
            <span className={`font-bold text-xl ${myBalance.netBalance >= 0 ? 'text-mint-500' : 'text-red-500'}`}>
              {myBalance.netBalance >= 0 ? '+' : '-'}?{Math.abs(myBalance.netBalance).toFixed(2)}
            </span>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
          <UserCircle className="text-primary-500" />
          Settle Up (Optimized)
        </h2>
        
        {settlements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500 dark:text-slate-400">
            <CheckCircle2 size={48} className="mb-2 text-mint-500/50" />
            <p>Everyone is settled up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Optimized minimum transactions to settle all debts.
            </p>
            {settlements.map((tx, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{tx.from}</span>
                  <ArrowRight size={16} className="text-slate-400" />
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{tx.to}</span>
                </div>
                <span className="font-bold text-primary-600 dark:text-primary-400">?{tx.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

