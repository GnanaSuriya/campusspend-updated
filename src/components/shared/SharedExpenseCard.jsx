import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { GlassCard } from '../ui';
import { CheckCircle2, Edit2, Trash2, XCircle, Clock, Users, ArrowRight } from 'lucide-react';

export default function SharedExpenseCard({ expense, currentUserId, onEdit, onDelete, onAccept, onReject, onApproveChange, onRejectChange }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  
  // Swipe to delete logic
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0], [0, 1]);
  const isCreator = expense.creator_id === currentUserId;

  const handleDragEnd = (e, info) => {
    if (info.offset.x < -80 && isCreator) { // Swipe left to delete
      triggerOptimisticDelete();
    } else {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 20 });
    }
  };

  const triggerOptimisticDelete = () => {
    setShowUndo(true);
    // Auto-delete after 5 seconds if not undone
    window.deleteTimeout = setTimeout(() => {
      setShowUndo(false);
      setIsDeleting(true);
      onDelete(expense.id).catch(() => {
        setIsDeleting(false);
        animate(x, 0); // Restore card if API fails
      });
    }, 5000);
  };

  const handleUndo = () => {
    clearTimeout(window.deleteTimeout);
    setShowUndo(false);
    animate(x, 0, { type: 'spring', stiffness: 300, damping: 20 });
  };

  if (isDeleting) return null;
  
  if (showUndo) {
    return (
      <div className="bg-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <span className="text-white font-medium">Expense deleted.</span>
        <button onClick={handleUndo} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">Undo</button>
      </div>
    );
  }

  // Determine user's participant record
  const myPart = expense.participants?.find(p => p.user_id === currentUserId);
  const statusColor = {
    'Accepted': 'text-mint-500 bg-mint-500/10 border-mint-500/20',
    'Pending': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    'Declined': 'text-red-500 bg-red-500/10 border-red-500/20',
    'Change_Pending': 'text-blue-500 bg-blue-500/10 border-blue-500/20'
  };

  // The displayed status should ideally be the overall expense status if Change_Pending, or the participant's status
  const displayStatus = expense.status === 'Change_Pending' ? 'Change_Pending' : (myPart ? myPart.status : expense.status);

  return (
    <motion.div style={{ x, opacity }} drag={isCreator ? "x" : false} dragConstraints={{ left: -100, right: 0 }} onDragEnd={handleDragEnd}>
      <GlassCard className="p-6 relative group overflow-hidden">
        {/* Swipe Hint */}
        {isCreator && (
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
             <Trash2 className="text-red-500" />
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">{expense.description}</h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor[displayStatus] || 'text-slate-500'}`}>
                {displayStatus.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
              Created by <span className="font-medium text-slate-700 dark:text-slate-300">{expense.creator_name}</span>
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex gap-2">
              <span className="font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">{expense.split_mode} Split</span>
              {expense.category && <span className="font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 px-2 py-0.5 rounded text-xs">{expense.category}</span>}
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-mint-500">
              ₹{expense.total_amount.toFixed(2)}
            </p>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 space-y-1">
               {myPart && <p>Your Share: <span className="font-bold text-slate-700 dark:text-slate-200">₹{myPart.amount_owed.toFixed(2)}</span></p>}
               {expense.payers?.filter(p => p.user_id === currentUserId).map((p, i) => (
                 <p key={i}>You Paid: <span className="font-bold text-slate-700 dark:text-slate-200">₹{p.amount_paid.toFixed(2)}</span></p>
               ))}
               
               {expense.settlements?.filter(s => s.debtor_id === currentUserId).map((s, i) => (
                 <p key={`debtor-${i}`} className="text-red-500 font-bold">You Owe: ₹{s.amount.toFixed(2)}</p>
               ))}
               {expense.settlements?.filter(s => s.creditor_id === currentUserId).map((s, i) => (
                 <p key={`creditor-${i}`} className="text-mint-500 font-bold">Owed to You: ₹{s.amount.toFixed(2)}</p>
               ))}
            </div>
          </div>
        </div>

        {/* Change Request Banner */}
        {expense.status === 'Change_Pending' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl">
            <div className="flex items-start gap-3">
              <Clock className="text-blue-500 shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Change Requested</p>
                {expense.change_requested_by !== currentUserId ? (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => onApproveChange(expense.id)} className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"><CheckCircle2 size={14}/> Approve</button>
                    <button onClick={() => onRejectChange(expense)} className="px-4 py-2.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"><XCircle size={14}/> Decline</button>
                  </div>
                ) : (
                  <p className="text-xs text-blue-600 dark:text-blue-300">Waiting for others to review your changes.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Accept/Decline Buttons for Participants */}
        {myPart && myPart.status === 'Pending' && expense.status !== 'Change_Pending' && (
          <div className="mt-4 flex gap-3">
            <button onClick={() => onAccept(expense.id)} className="flex-1 py-3 bg-mint-500 hover:bg-mint-600 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2">
              <CheckCircle2 size={18} /> Accept Share
            </button>
            <button onClick={() => onReject(expense)} className="flex-1 py-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 text-sm font-bold rounded-xl transition flex items-center justify-center gap-2">
              <XCircle size={18} /> Decline
            </button>
          </div>
        )}

        {/* Action Buttons for Creator */}
        {isCreator && (
          <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800/50 pt-4 relative z-10">
            <button onClick={() => onEdit(expense)} className="p-3 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all" title="Edit Expense">
              <Edit2 size={18} />
            </button>
            <button onClick={triggerOptimisticDelete} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all" title="Delete">
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

