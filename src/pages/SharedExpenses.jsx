import React, { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassInput, GlassModal } from '../components/ui';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getCategories } from '../utils/categories';
import { CheckCircle2, Edit2, Trash2, XCircle } from 'lucide-react';

export default function SharedExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  
  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [declineData, setDeclineData] = useState(null);
  
  const categories = getCategories(user.student_type);
  const [formData, setFormData] = useState({ 
    description: '', total_amount: '', category: categories[0], creator_percentage: '50', other_user_email: '' 
  });
  
  const [editData, setEditData] = useState(null);
  const [declineReason, setDeclineReason] = useState('');

  const fetchData = async () => {
    try {
      const res = await api.get('/shared');
      if (res.data.success) setExpenses(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post('/shared', formData);
      setFormData({ description: '', total_amount: '', category: categories[0], creator_percentage: '50', other_user_email: '' });
      setIsExpenseModalOpen(false);
      fetchData();
      alert("Request sent successfully!");
    } catch (err) {
      alert(err.response?.data?.error || "Error adding shared expense");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/shared/${editData.id}`, {
        creator_percentage: editData.creator_percentage
      });
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Error editing expense");
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this shared expense? This will remove it for both users.")) {
      try {
        await api.delete(`/shared/${id}`);
        fetchData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleStatusUpdate = async (id, status, reason = null) => {
    try {
      const payload = { status };
      if (reason) payload.decline_reason = reason;
      await api.patch(`/shared/${id}`, payload);
      if (status === 'Declined') setDeclineData(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Error updating status");
    }
  };

  const myExpenses = expenses.filter(e => e.creator_id === user.id);
  const sharedWithMe = expenses.filter(e => e.other_user_id === user.id);

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Shared Expenses</h1>
          <p className="text-slate-600 mt-1">Split bills 1-on-1 with friends</p>
        </div>
        <GlassButton onClick={() => setIsExpenseModalOpen(true)}>
          Split a Bill
        </GlassButton>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shared By Me */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-slate-800">Shared by Me</h2>
          {myExpenses.length > 0 ? myExpenses.map(exp => (
            <ExpenseCard key={exp.id} exp={exp} isCreator={true} user={user} onEdit={() => { setEditData(exp); setIsEditModalOpen(true); }} onDelete={handleDelete} onStatus={handleStatusUpdate} onDeclineInit={() => {}} />
          )) : (
            <div className="text-center py-8 text-slate-500">You haven't shared any expenses.</div>
          )}
        </div>

        {/* Shared With Me */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-slate-800">Shared with Me</h2>
          {sharedWithMe.length > 0 ? sharedWithMe.map(exp => (
            <ExpenseCard key={exp.id} exp={exp} isCreator={false} user={user} onEdit={() => { setEditData(exp); setIsEditModalOpen(true); }} onDelete={handleDelete} onStatus={handleStatusUpdate} onDeclineInit={(id) => { setDeclineData(id); setDeclineReason(''); }} />
          )) : (
            <div className="text-center py-8 text-slate-500">No one has shared expenses with you.</div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <GlassModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Split a Bill">
        <form onSubmit={handleAddExpense} className="flex flex-col gap-4">
          <GlassInput 
            placeholder="Description (e.g. Dinner)" 
            value={formData.description} 
            onChange={(e) => setFormData({...formData, description: e.target.value})} 
            required 
          />
          <GlassInput 
            type="number" 
            placeholder="Total Amount (₹)" 
            value={formData.total_amount} 
            onChange={(e) => setFormData({...formData, total_amount: e.target.value})} 
            required 
            min="1" step="0.01"
          />
          <select 
            className="w-full px-4 py-3 rounded-xl glass-input text-slate-800"
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            required
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <GlassInput 
            type="email" 
            placeholder="Friend's Email Address" 
            value={formData.other_user_email} 
            onChange={(e) => setFormData({...formData, other_user_email: e.target.value})} 
            required 
          />
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50">
            <label className="text-sm font-bold text-slate-700">Split Percentage</label>
            <div className="flex gap-4 items-center">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs text-slate-500 text-center">My %</span>
                <GlassInput 
                  type="number" 
                  value={formData.creator_percentage} 
                  onChange={(e) => {
                    let val = parseFloat(e.target.value);
                    if (val > 100) val = 100;
                    if (val < 0) val = 0;
                    setFormData({...formData, creator_percentage: val})
                  }} 
                  required 
                  min="0" max="100"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs text-slate-500 text-center">Friend's %</span>
                <GlassInput 
                  type="number" 
                  value={100 - (parseFloat(formData.creator_percentage) || 0)} 
                  disabled
                  className="opacity-70"
                />
              </div>
            </div>
            {formData.total_amount && (
              <div className="flex justify-between text-sm mt-2 font-medium">
                <span className="text-primary-700">My Share: ₹{(parseFloat(formData.total_amount) * (parseFloat(formData.creator_percentage) || 0) / 100).toFixed(2)}</span>
                <span className="text-mint-700">Friend's Share: ₹{(parseFloat(formData.total_amount) * (100 - (parseFloat(formData.creator_percentage) || 0)) / 100).toFixed(2)}</span>
              </div>
            )}
          </div>
          <GlassButton type="submit" className="mt-4">Save Shared Expense</GlassButton>
        </form>
      </GlassModal>

      {/* Edit Modal */}
      {editData && (
        <GlassModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Split">
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-slate-600 mb-2">Editing split for: <strong>{editData.description}</strong> (Total: ₹{editData.total_amount})</p>
            <div className="flex gap-4 items-center">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs text-slate-500 text-center">Creator %</span>
                <GlassInput 
                  type="number" 
                  value={editData.creator_percentage} 
                  onChange={(e) => {
                    let val = parseFloat(e.target.value);
                    if (val > 100) val = 100;
                    if (val < 0) val = 0;
                    setEditData({...editData, creator_percentage: val})
                  }} 
                  required 
                  min="0" max="100"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs text-slate-500 text-center">Other %</span>
                <GlassInput 
                  type="number" 
                  value={100 - (parseFloat(editData.creator_percentage) || 0)} 
                  disabled
                  className="opacity-70"
                />
              </div>
            </div>
            <div className="flex justify-between text-sm mt-2 font-medium">
              <span className="text-primary-700">Creator: ₹{(editData.total_amount * (parseFloat(editData.creator_percentage) || 0) / 100).toFixed(2)}</span>
              <span className="text-mint-700">Other: ₹{(editData.total_amount * (100 - (parseFloat(editData.creator_percentage) || 0)) / 100).toFixed(2)}</span>
            </div>
            <GlassButton type="submit" className="mt-4">Update Split</GlassButton>
          </form>
        </GlassModal>
      )}

      {/* Decline Modal */}
      {declineData && (
        <GlassModal isOpen={!!declineData} onClose={() => setDeclineData(null)} title="Decline Shared Expense">
          <form onSubmit={(e) => { e.preventDefault(); handleStatusUpdate(declineData, 'Declined', declineReason); }} className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">Please provide a reason for declining:</p>
            <textarea
              className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 resize-none h-24"
              placeholder="I already paid my share separately..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              required
            />
            <div className="flex gap-2 mt-2">
              <GlassButton type="button" onClick={() => setDeclineData(null)} className="flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300">Cancel</GlassButton>
              <GlassButton type="submit" className="flex-1 bg-red-500 hover:bg-red-600 border-none text-white shadow-none">Decline Request</GlassButton>
            </div>
          </form>
        </GlassModal>
      )}
    </div>
  );
}

function ExpenseCard({ exp, isCreator, user, onEdit, onDelete, onStatus, onDeclineInit }) {
  const myPct = isCreator ? exp.creator_percentage : exp.other_percentage;
  const friendPct = isCreator ? exp.other_percentage : exp.creator_percentage;
  const myAmount = (exp.total_amount * myPct) / 100;
  const friendAmount = (exp.total_amount * friendPct) / 100;

  return (
    <GlassCard className="flex flex-col gap-4">
      <div className="flex justify-between items-start border-b border-slate-200/50 pb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{exp.description}</h3>
          <p className="text-sm text-slate-500">Total: ₹{exp.total_amount.toFixed(2)}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            exp.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
            exp.status === 'Declined' ? 'bg-red-100 text-red-700' :
            'bg-mint-100 text-mint-700'
          }`}>
            {exp.status}
          </span>
          <p className="text-xs text-slate-400 mt-1">{new Date(exp.date).toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="flex justify-between text-sm">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-slate-700">Your Share</span>
          <span className="text-slate-800">₹{myAmount.toFixed(2)} ({myPct}%)</span>
        </div>
        <div className="flex flex-col gap-1 text-right">
          <span className="font-bold text-slate-700">
            {isCreator ? (exp.other_user_name || exp.other_user_email) : (exp.creator_name || exp.creator_email)}'s Share
          </span>
          <span className="text-slate-800">₹{friendAmount.toFixed(2)} ({friendPct}%)</span>
        </div>
      </div>

      {exp.status === 'Declined' && exp.decline_reason && (
        <div className="mt-1 p-3 bg-red-500/10 border border-red-500/20 text-red-700 rounded-xl text-sm">
          <strong>Reason for declining:</strong>
          <p className="mt-1 text-slate-600">{exp.decline_reason}</p>
        </div>
      )}

      <div className="flex gap-2 justify-end mt-2 pt-3 border-t border-slate-200/50">
        {!isCreator && exp.status === 'Pending' && (
          <>
            <button 
              onClick={() => onStatus(exp.id, 'Accepted')}
              className="flex items-center gap-1 text-sm bg-mint-500/10 text-mint-700 px-3 py-1 rounded-lg hover:bg-mint-500/20"
            >
              <CheckCircle2 size={16} /> Accept
            </button>
            <button 
              onClick={() => onDeclineInit(exp.id)}
              className="flex items-center gap-1 text-sm bg-red-500/10 text-red-700 px-3 py-1 rounded-lg hover:bg-red-500/20"
            >
              <XCircle size={16} /> Decline
            </button>
          </>
        )}
        <button 
          onClick={onEdit}
          className="flex items-center gap-1 text-sm bg-primary-500/10 text-primary-700 px-3 py-1 rounded-lg hover:bg-primary-500/20"
        >
          <Edit2 size={16} /> Edit Split
        </button>
        {isCreator && (
          <button 
            onClick={() => onDelete(exp.id)}
            className="flex items-center gap-1 text-sm bg-slate-500/10 text-slate-700 px-3 py-1 rounded-lg hover:bg-slate-500/20"
          >
            <Trash2 size={16} /> Delete
          </button>
        )}
      </div>
    </GlassCard>
  );
}
