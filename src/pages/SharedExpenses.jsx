import React, { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassInput, GlassModal } from '../components/ui';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getCategories } from '../utils/categories';
import { CheckCircle2, Edit2, Trash2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export default function SharedExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  
  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [declineData, setDeclineData] = useState(null);
  const [rejectChangeData, setRejectChangeData] = useState(null);
  
  const categories = getCategories(user.student_type);
  const [formData, setFormData] = useState({ 
    description: '', total_amount: '', category: categories[0], creator_percentage: '50', other_user_name: '' 
  });
  
  const [editData, setEditData] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [rejectChangeReason, setRejectChangeReason] = useState('');

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
      setFormData({ description: '', total_amount: '', category: categories[0], creator_percentage: '50', other_user_name: '' });
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
      const res = await api.patch(`/shared/${editData.id}`, {
        creator_percentage: editData.creator_percentage,
        total_amount: editData.total_amount
      });
      setIsEditModalOpen(false);
      fetchData();
      if (res.data.data.status === 'Change_Pending') {
        alert("Change request sent.\nWaiting for your friend's approval.");
      } else {
        alert("Expense updated.");
      }
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

  const handleStatusUpdate = async (id, status) => {
    if (status === 'Declined' && !declineReason.trim()) {
      alert("Please enter a reason for declining.");
      return;
    }
    try {
      await api.patch(`/shared/${id}`, { 
        status, 
        decline_reason: declineReason 
      });
      if (status === 'Declined') {
        setDeclineData(null);
        setDeclineReason('');
      }
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Error updating status");
    }
  };

  const handleApproveChange = async (id) => {
    try {
      await api.post(`/shared/${id}/approve_change`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Error approving change");
    }
  };

  const handleRejectChangeSubmit = async () => {
    if (!rejectChangeReason.trim()) {
      alert("Please enter a reason for declining this change.");
      return;
    }
    try {
      await api.post(`/shared/${rejectChangeData.id}/reject_change`, {
        reason: rejectChangeReason
      });
      setRejectChangeData(null);
      setRejectChangeReason('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Error rejecting change");
    }
  };

  const sent = expenses.filter(e => e.creator_id === user.id);
  const received = expenses.filter(e => e.other_user_id === user.id);

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Shared Expenses</h1>
          <p className="text-slate-600 mt-1">Split bills and track who owes what.</p>
        </div>
        <GlassButton onClick={() => setIsExpenseModalOpen(true)}>
          + New Shared Expense
        </GlassButton>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            Received by Me
            <span className="bg-primary-100 text-primary-700 text-sm py-0.5 px-2 rounded-full font-bold">{received.length}</span>
          </h2>
          <div className="flex flex-col gap-4">
            {received.length > 0 ? (
              received.map(exp => (
                <ExpenseCard 
                  key={exp.id} 
                  exp={exp} 
                  isCreator={false} 
                  user={user}
                  onEdit={() => { setEditData(exp); setIsEditModalOpen(true); }}
                  onStatus={handleStatusUpdate}
                  onDeclineInit={() => setDeclineData(exp)}
                  onApproveChange={handleApproveChange}
                  onRejectChangeInit={() => setRejectChangeData(exp)}
                />
              ))
            ) : (
              <div className="text-slate-500 p-8 text-center bg-white/20 rounded-2xl border border-white/40">No expenses shared with you.</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            Shared by Me
            <span className="bg-primary-100 text-primary-700 text-sm py-0.5 px-2 rounded-full font-bold">{sent.length}</span>
          </h2>
          <div className="flex flex-col gap-4">
            {sent.length > 0 ? (
              sent.map(exp => (
                <ExpenseCard 
                  key={exp.id} 
                  exp={exp} 
                  isCreator={true} 
                  user={user}
                  onEdit={() => { setEditData(exp); setIsEditModalOpen(true); }}
                  onDelete={handleDelete}
                  onApproveChange={handleApproveChange}
                  onRejectChangeInit={() => setRejectChangeData(exp)}
                />
              ))
            ) : (
              <div className="text-slate-500 p-8 text-center bg-white/20 rounded-2xl border border-white/40">You haven't shared any expenses.</div>
            )}
          </div>
        </div>
      </div>

      {/* Decline Initial Request Modal */}
      {declineData && (
        <GlassModal isOpen={true} onClose={() => setDeclineData(null)} title="Decline Shared Expense">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">Why are you declining this expense?</p>
            <textarea 
              className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 resize-none h-24"
              placeholder="Enter reason..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setDeclineData(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
              <GlassButton onClick={() => handleStatusUpdate(declineData.id, 'Declined')} className="bg-red-500 text-white hover:bg-red-600">Decline & Send</GlassButton>
            </div>
          </div>
        </GlassModal>
      )}

      {/* Decline Change Modal */}
      {rejectChangeData && (
        <GlassModal isOpen={true} onClose={() => setRejectChangeData(null)} title="Decline Change">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">Why are you declining this change?</p>
            <textarea 
              className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 resize-none h-24"
              placeholder="Enter reason..."
              value={rejectChangeReason}
              onChange={(e) => setRejectChangeReason(e.target.value)}
            />
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={() => setRejectChangeData(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
              <GlassButton onClick={handleRejectChangeSubmit} className="bg-red-500 text-white hover:bg-red-600">Decline & Send</GlassButton>
            </div>
          </div>
        </GlassModal>
      )}

      {/* New Expense Modal */}
      <GlassModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Share an Expense">
        <form onSubmit={handleAddExpense} className="flex flex-col gap-4">
          <GlassInput 
            type="text" 
            placeholder="Description (e.g. Dinner, Movie)" 
            value={formData.description} 
            onChange={(e) => setFormData({...formData, description: e.target.value})} 
            required 
          />
          <GlassInput 
            type="number" 
            placeholder="Total Amount (?)" 
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
            type="text" 
            placeholder="Friend's Name" 
            value={formData.other_user_name} 
            onChange={(e) => setFormData({...formData, other_user_name: e.target.value})} 
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
          </div>
          <GlassButton type="submit" className="mt-4">Save Shared Expense</GlassButton>
        </form>
      </GlassModal>

      {/* Edit Modal */}
      {editData && (
        <GlassModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Shared Expense">
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-slate-600 mb-2">Editing: <strong>{editData.description}</strong></p>
            <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">Total Amount (?)</span>
                <GlassInput 
                  type="number" 
                  value={editData.total_amount} 
                  onChange={(e) => setEditData({...editData, total_amount: e.target.value})} 
                  required 
                  min="1" step="0.01"
                />
            </div>
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
            <GlassButton type="submit" className="mt-4">Submit Changes</GlassButton>
          </form>
        </GlassModal>
      )}
    </div>
  );
}

function ExpenseCard({ exp, isCreator, user, onEdit, onDelete, onStatus, onDeclineInit, onApproveChange, onRejectChangeInit }) {
  const [showHistory, setShowHistory] = useState(false);
  
  const myPct = isCreator ? exp.creator_percentage : exp.other_percentage;
  const friendPct = isCreator ? exp.other_percentage : exp.creator_percentage;
  const myAmount = (exp.total_amount * myPct) / 100;
  const friendAmount = (exp.total_amount * friendPct) / 100;

  const isChangePending = exp.status === 'Change_Pending';
  const iRequestedChange = exp.change_requested_by === user.id;

  return (
    <GlassCard className="flex flex-col gap-4">
      <div className="flex justify-between items-start border-b border-slate-200/50 pb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{exp.description}</h3>
          <p className="text-sm text-slate-500">Total: ?{exp.total_amount.toFixed(2)}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            exp.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
            exp.status === 'Declined' ? 'bg-red-100 text-red-700' :
            exp.status === 'Change_Pending' ? 'bg-blue-100 text-blue-700' :
            'bg-mint-100 text-mint-700'
          }`}>
            {exp.status === 'Change_Pending' ? 'Change Pending' : exp.status}
          </span>
          <p className="text-xs text-slate-400 mt-1">{new Date(exp.date).toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="flex justify-between text-sm">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-slate-700">Your Share</span>
          <span className="text-slate-800">?{myAmount.toFixed(2)} ({myPct}%)</span>
        </div>
        <div className="flex flex-col gap-1 text-right">
          <span className="font-bold text-slate-700">
            {isCreator ? (exp.other_user_name || exp.other_user_email) : (exp.creator_name || exp.creator_email)}'s Share
          </span>
          <span className="text-slate-800">?{friendAmount.toFixed(2)} ({friendPct}%)</span>
        </div>
      </div>

      {isChangePending && exp.pending_changes && (
        <div className="mt-1 p-4 bg-blue-500/10 border border-blue-500/20 text-blue-800 rounded-xl text-sm shadow-inner">
          <strong className="text-blue-900 block mb-2 text-base">Expense Change Request</strong>
          <div className="mb-3 text-slate-700">
            {exp.change_requested_by === exp.creator_id ? exp.creator_name : exp.other_user_name} wants to change:
          </div>
          <div className="flex flex-col gap-1 text-sm bg-white/40 p-3 rounded-lg border border-white/50">
            {exp.pending_changes.total_amount && (
              <div>
                <span className="text-slate-500">Previous amount:</span> ?{exp.total_amount} <br/>
                <span className="text-slate-500">New amount:</span> <b>?{exp.pending_changes.total_amount}</b> <br/>
                <span className="text-slate-500">Difference:</span> <span className={exp.pending_changes.total_amount - exp.total_amount > 0 ? "text-red-600 font-bold" : "text-mint-600 font-bold"}>{exp.pending_changes.total_amount - exp.total_amount > 0 ? "+" : ""}?{(exp.pending_changes.total_amount - exp.total_amount).toFixed(2)}</span>
              </div>
            )}
            {exp.pending_changes.creator_percentage && (
              <div className="mt-2 pt-2 border-t border-blue-500/10">
                <span className="text-slate-500">Split:</span> {exp.creator_percentage}% / {exp.other_percentage}% ? <b>{exp.pending_changes.creator_percentage}% / {exp.pending_changes.other_percentage}%</b>
              </div>
            )}
          </div>
          {!iRequestedChange && (
            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => onApproveChange(exp.id)}
                className="flex-1 items-center justify-center gap-1 text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 font-bold text-center transition-colors shadow-sm"
              >
                Accept Changes
              </button>
              <button 
                onClick={() => onRejectChangeInit(exp.id)}
                className="flex-1 items-center justify-center gap-1 text-sm bg-white text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 font-bold text-center transition-colors shadow-sm"
              >
                Decline
              </button>
            </div>
          )}
          {iRequestedChange && (
            <div className="mt-3 text-sm italic text-blue-600/80 text-center font-medium">Waiting for friend's approval...</div>
          )}
        </div>
      )}

      {/* History Toggle */}
      {exp.activities && exp.activities.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-200/50">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Clock size={14} /> 
            {showHistory ? 'Hide History' : 'View History'}
            {showHistory ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          
          {showHistory && (
            <div className="mt-3 flex flex-col gap-3 pl-2 border-l-2 border-slate-200">
              {exp.activities.map((act, idx) => (
                <div key={idx} className="relative pl-3">
                  <div className="absolute w-2 h-2 bg-primary-400 rounded-full -left-[5px] top-1.5 ring-4 ring-white"></div>
                  <div className="text-xs text-slate-400 mb-0.5">{new Date(act.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</div>
                  <div className="text-sm text-slate-700">
                    {act.action === 'created' && (
                      <span><strong>{act.user_name}</strong> shared ?{act.details?.total_amount}</span>
                    )}
                    {act.action === 'accepted' && (
                      <span className="text-mint-700"><strong>? Accepted</strong> by {act.user_name}</span>
                    )}
                    {act.action === 'declined' && (
                      <div className="text-red-600">
                        <strong>? Declined</strong> by {act.user_name}
                        <div className="mt-1 bg-red-500/10 p-2 rounded text-xs">Reason: "{act.reason}"</div>
                      </div>
                    )}
                    {act.action === 'change_requested' && (
                      <div>
                        <strong>{act.user_name}</strong> requested a change
                        {act.details?.new_amount && (
                          <div className="mt-1 font-mono text-xs">?{act.details.old_amount} ? ?{act.details.new_amount}</div>
                        )}
                      </div>
                    )}
                    {act.action === 'change_approved' && (
                      <div className="text-mint-700">
                        <strong>? Change accepted</strong> by {act.user_name}
                      </div>
                    )}
                    {act.action === 'change_declined' && (
                      <div className="text-red-600">
                        <strong>? Change declined</strong> by {act.user_name}
                        <div className="mt-1 bg-red-500/10 p-2 rounded text-xs">Reason: "{act.reason}"</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
        {/* ONLY creator can edit */}
        {isCreator && exp.status !== 'Change_Pending' && (
          <button 
            onClick={onEdit}
            className="flex items-center gap-1 text-sm bg-primary-500/10 text-primary-700 px-3 py-1 rounded-lg hover:bg-primary-500/20"
          >
            <Edit2 size={16} /> Edit
          </button>
        )}
        {isCreator && (
          <button 
            onClick={() => onDelete(exp.id)}
            className="flex items-center gap-1 text-sm bg-slate-500/10 text-slate-700 px-3 py-1 rounded-lg hover:bg-slate-500/20"
          >
            <Trash2 size={16} /> Cancel Request
          </button>
        )}
      </div>
    </GlassCard>
  );
}
