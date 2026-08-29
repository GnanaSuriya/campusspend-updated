import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { GlassCard } from '../ui';
import { Trash2 } from 'lucide-react';

export default function TransactionCard({ tx, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  
  // Swipe to delete logic
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0], [0, 1]);
  // Only allow delete if not shared (shared are deleted via SharedExpenses page)
  const canDelete = !tx.is_shared;

  const handleDragEnd = (e, info) => {
    if (info.offset.x < -80 && canDelete) { // Swipe left to delete
      triggerOptimisticDelete();
    } else {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 20 });
    }
  };

  const triggerOptimisticDelete = () => {
    setShowUndo(true);
    // Auto-delete after 5 seconds if not undone
    window[`deleteTimeout_tx_${tx.id}`] = setTimeout(() => {
      setShowUndo(false);
      setIsDeleting(true);
      onDelete(tx.id).catch(() => {
        setIsDeleting(false);
        animate(x, 0); // Restore card if API fails
      });
    }, 5000);
  };

  const handleUndo = () => {
    clearTimeout(window[`deleteTimeout_tx_${tx.id}`]);
    setShowUndo(false);
    animate(x, 0, { type: 'spring', stiffness: 300, damping: 20 });
  };

  if (isDeleting) return null;
  
  if (showUndo) {
    return (
      <div className="bg-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg mb-4">
        <span className="text-white font-medium">Transaction deleted.</span>
        <button onClick={handleUndo} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">Undo</button>
      </div>
    );
  }

  return (
    <motion.div style={{ x, opacity }} drag={canDelete ? "x" : false} dragConstraints={{ left: -100, right: 0 }} onDragEnd={handleDragEnd} className="mb-4">
      <GlassCard className="p-4 relative group overflow-hidden">
        {/* Swipe Hint */}
        {canDelete && (
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
             <Trash2 className="text-red-500" />
          </div>
        )}
        
        <div className="flex items-center justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                {tx.category}
              </span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {new Date(tx.date).toLocaleDateString()}
              </span>
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white">
              {tx.description || tx.category}
            </h3>
            {tx.payment_method && (
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                Via {tx.payment_method}
              </p>
            )}
          </div>
          
          <div className="text-right flex flex-col items-end">
            <p className="text-xl font-black text-slate-800 dark:text-white">
              ₹{tx.amount.toFixed(2)}
            </p>
            {canDelete && (
              <button 
                onClick={triggerOptimisticDelete} 
                className="mt-2 text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors sm:hidden"
                title="Delete Transaction"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
