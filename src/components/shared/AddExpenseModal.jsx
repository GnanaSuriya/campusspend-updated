import React, { useState, useEffect } from 'react';
import { GlassModal, GlassButton, GlassInput } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Percent, CheckCircle2 } from 'lucide-react';
import { calculateUniformSplit } from '../../utils/settlements';

export default function AddExpenseModal({ isOpen, onClose, onSubmit, categories }) {
  const { user } = useAuth();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [splitMode, setSplitMode] = useState('Uniform'); // Uniform, Specific Value, Ratio
  
  const [participants, setParticipants] = useState([{ name: user.name, user_id: user.id, amount: 0, percentage: 0 }]);
  const [payers, setPayers] = useState([{ name: user.name, user_id: user.id, amount: 0 }]);
  const [friendName, setFriendName] = useState('');
  const [friendSearchStatus, setFriendSearchStatus] = useState(null);
  const [foundFriend, setFoundFriend] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [payerName, setPayerName] = useState('');
  const [payerSearchStatus, setPayerSearchStatus] = useState(null);
  const [foundPayer, setFoundPayer] = useState(null);
  const [isPayerSearching, setIsPayerSearching] = useState(false);

  // Auto-recalculate amounts when total or mode changes
  useEffect(() => {
    const total = parseFloat(amount) || 0;
    
    // Auto-fill payers if only 1 payer exists
    if (payers.length === 1) {
      setPayers([{ ...payers[0], amount: total }]);
    }
    
    if (splitMode === 'Uniform') {
      const splits = calculateUniformSplit(total, participants.length);
      setParticipants(participants.map((p, i) => ({
        ...p,
        amount: splits[i],
        percentage: parseFloat((100 / participants.length).toFixed(2))
      })));
    } else if (splitMode === 'Ratio') {
      setParticipants(participants.map(p => ({
        ...p,
        amount: parseFloat(((p.percentage / 100) * total).toFixed(2)) || 0
      })));
    }
    // For Specific Value, we do NOT auto-recalculate amounts to allow manual entry
  }, [amount, splitMode, participants.length]); // intentionally omitting participants from deps to avoid infinite loops

  const searchFriend = async () => {
    if (!friendName.trim()) {
      setFriendSearchStatus("Please enter a friend's name.");
      setFoundFriend(null);
      return;
    }
    
    setIsSearching(true);
    setFriendSearchStatus(null);
    try {
      const res = await api.get(`/auth/search?q=${encodeURIComponent(friendName)}`);
      if (res.data.success) {
        setFoundFriend(res.data.data);
        setFriendSearchStatus(`? User exists: ${res.data.data.name}`);
      }
    } catch (err) {
      setFoundFriend(null);
      setFriendSearchStatus("Friend not found. No CampusSpend account exists with this name.");
    } finally {
      setIsSearching(false);
    }
  };

  const addParticipant = () => {
    if (!foundFriend) {
      if (friendName) searchFriend();
      return;
    }
    
    if (participants.find(p => p.user_id === foundFriend.id || p.name.toLowerCase() === foundFriend.name.toLowerCase())) {
      setFriendSearchStatus("User is already a participant.");
      return;
    }
    
    setParticipants([...participants, { name: foundFriend.name, user_id: foundFriend.id, amount: 0, percentage: 0 }]);
    setFriendName('');
    setFoundFriend(null);
    setFriendSearchStatus(null);
  };

  const removeParticipant = (idx) => {
    if (idx === 0) return; // Cant remove self
    setParticipants(participants.filter((_, i) => i !== idx));
  };

  const searchPayer = async () => {
    if (!payerName.trim()) {
      setPayerSearchStatus("Please enter a friend's name.");
      setFoundPayer(null);
      return;
    }
    
    setIsPayerSearching(true);
    setPayerSearchStatus(null);
    try {
      const res = await api.get(`/auth/search?q=${encodeURIComponent(payerName)}`);
      if (res.data.success) {
        setFoundPayer(res.data.data);
        setPayerSearchStatus(`? User exists: ${res.data.data.name}`);
      }
    } catch (err) {
      setFoundPayer(null);
      setPayerSearchStatus("Friend not found. No CampusSpend account exists with this name.");
    } finally {
      setIsPayerSearching(false);
    }
  };

  const addPayer = () => {
    if (!foundPayer) {
      if (payerName) searchPayer();
      return;
    }
    
    if (payers.find(p => p.user_id === foundPayer.id || p.name.toLowerCase() === foundPayer.name.toLowerCase())) {
      setPayerSearchStatus("User is already a payer.");
      return;
    }
    
    setPayers([...payers, { name: foundPayer.name, user_id: foundPayer.id, amount: 0 }]);
    setPayerName('');
    setFoundPayer(null);
    setPayerSearchStatus(null);
  };

  const updateParticipant = (idx, field, val) => {
    const newP = [...participants];
    newP[idx][field] = val; // Store exact input to allow typing decimals
    
    if (splitMode === 'Ratio' && field === 'percentage') {
      const parsedPct = parseFloat(val) || 0;
      newP[idx].amount = parseFloat(((parsedPct / 100) * (parseFloat(amount) || 0)).toFixed(2));
    }
    
    setParticipants(newP);
  };

  const updatePayer = (idx, val) => {
    const newP = [...payers];
    newP[idx].amount = val;
    setPayers(newP);
  };

  const totalAllocated = participants.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const totalPercentage = participants.reduce((sum, p) => sum + (parseFloat(p.percentage) || 0), 0);
  const totalPaid = payers.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const expenseTotal = parseFloat(amount) || 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (expenseTotal <= 0) return alert("Amount must be greater than 0");
    if (participants.length < 2) return alert("Add at least one friend");
    
    if (Math.abs(totalPaid - expenseTotal) > 0.01) {
      return alert(`Total paid (${totalPaid}) must equal expense amount (${expenseTotal})`);
    }
    
    if (splitMode === 'Specific Value' && Math.abs(totalAllocated - expenseTotal) > 0.01) {
      return alert(`Total allocated (${totalAllocated}) must equal expense amount (${expenseTotal})`);
    }
    
    if (splitMode === 'Ratio' && Math.abs(totalPercentage - 100) > 0.1) {
      return alert(`Total percentage (${totalPercentage}%) must equal 100%`);
    }
    
    // Map to API format
    const pData = participants.map(p => ({
      user_name: p.name,
      user_id: p.user_id,
      amount: p.amount,
      percentage: splitMode === 'Ratio' ? p.percentage : parseFloat(((p.amount / expenseTotal) * 100).toFixed(2))
    }));
    
    const payerData = payers.map(p => ({ user_name: p.name, user_id: p.user_id, amount: p.amount }));

    onSubmit({
      description,
      total_amount: expenseTotal,
      category,
      split_mode: splitMode,
      participants: pData,
      payers: payerData
    });
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Add Shared Expense">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
            <GlassInput value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Dinner" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Total Amount (?)</label>
            <GlassInput type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 dark:text-white">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h3 className="font-bold text-slate-800 dark:text-white mb-3">Who Paid?</h3>
          {payers.map((p, idx) => (
            <div key={idx} className="flex gap-2 mb-2 items-center">
              <span className="flex-1 dark:text-white font-medium">{p.name}</span>
              <div className="w-1/3">
                <GlassInput type="number" step="0.01" value={p.amount} onChange={(e) => updatePayer(idx, e.target.value)} />
              </div>
              {idx > 0 && <button type="button" onClick={() => setPayers(payers.filter((_, i) => i !== idx))}><X size={18} className="text-red-500" /></button>}
            </div>
          ))}
          <div className="flex flex-col gap-2 mt-2">
              <div className="flex gap-2">
                <GlassInput 
                  value={payerName} 
                  onChange={(e) => {
                    setPayerName(e.target.value);
                    setFoundPayer(null);
                    setPayerSearchStatus(null);
                  }} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (foundPayer) addPayer();
                      else searchPayer();
                    }
                  }}
                  placeholder="Friend's Name (e.g. Rahul)" 
                  className="flex-1" 
                />
                {!foundPayer ? (
                  <GlassButton type="button" onClick={searchPayer} disabled={isPayerSearching} className="px-4 py-2 shrink-0">
                    {isPayerSearching ? 'Searching...' : 'Check User'}
                  </GlassButton>
                ) : (
                  <GlassButton type="button" onClick={addPayer} className="px-4 py-2 shrink-0 bg-mint-500 hover:bg-mint-600 text-white">
                    Add as Payer
                  </GlassButton>
                )}
              </div>
              {payerSearchStatus && (
                <div className={`text-sm font-medium px-2 ${foundPayer ? 'text-mint-600 dark:text-mint-400' : 'text-red-500'}`}>
                  {payerSearchStatus}
                </div>
              )}
            </div>
          <div className={`text-sm mt-2 font-medium ${Math.abs(totalPaid - expenseTotal) < 0.01 ? 'text-mint-500' : 'text-amber-500'}`}>
            Total Paid: ?{totalPaid.toFixed(2)} / ?{expenseTotal.toFixed(2)}
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 dark:text-white">Split Between Participants</h3>
            <select value={splitMode} onChange={(e) => setSplitMode(e.target.value)} className="bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm dark:text-white">
              <option value="Uniform">Uniform</option>
              <option value="Specific Value">Specific Value</option>
              <option value="Ratio">Ratio (%)</option>
            </select>
          </div>
          
          <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
            {participants.map((p, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <span className="flex-1 dark:text-white font-medium">{p.name} {idx === 0 && '(You)'}</span>
                
                {splitMode === 'Ratio' && (
                  <div className="w-1/4 flex items-center gap-1">
                    <GlassInput type="number" step="0.1" value={p.percentage} onChange={(e) => updateParticipant(idx, 'percentage', e.target.value)} />
                    <Percent size={14} className="text-slate-400" />
                  </div>
                )}
                
                <div className="w-1/3">
                  <GlassInput type="number" step="0.01" value={p.amount} disabled={splitMode !== 'Specific Value'} onChange={(e) => updateParticipant(idx, 'amount', e.target.value)} />
                </div>
                
                {idx > 0 && <button type="button" onClick={() => removeParticipant(idx)}><X size={18} className="text-red-500" /></button>}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 mt-4">
              <div className="flex gap-2">
                <GlassInput 
                  value={friendName} 
                  onChange={(e) => {
                    setFriendName(e.target.value);
                    setFoundFriend(null);
                    setFriendSearchStatus(null);
                  }} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (foundFriend) addParticipant();
                      else searchFriend();
                    }
                  }}
                  placeholder="Friend's Name (e.g. Rahul)" 
                  className="flex-1" 
                />
                {!foundFriend ? (
                  <GlassButton type="button" onClick={searchFriend} disabled={isSearching} className="px-4 py-2 shrink-0">
                    {isSearching ? 'Searching...' : 'Check User'}
                  </GlassButton>
                ) : (
                  <GlassButton type="button" onClick={addParticipant} className="px-4 py-2 shrink-0 bg-mint-500 hover:bg-mint-600 text-white">
                    Add to Expense
                  </GlassButton>
                )}
              </div>
              {friendSearchStatus && (
                <div className={`text-sm font-medium px-2 ${foundFriend ? 'text-mint-600 dark:text-mint-400' : 'text-red-500'}`}>
                  {friendSearchStatus}
                </div>
              )}
            </div>

          <div className="mt-4 text-sm font-medium">
            {splitMode === 'Ratio' && (
               <div className={Math.abs(totalPercentage - 100) < 0.1 ? 'text-mint-500' : 'text-amber-500'}>
                 Total Allocated: {totalPercentage}% / 100%
               </div>
            )}
            {splitMode !== 'Ratio' && (
               <div className={Math.abs(totalAllocated - expenseTotal) < 0.01 ? 'text-mint-500' : 'text-amber-500'}>
                 Total Allocated: ?{totalAllocated.toFixed(2)} / ?{expenseTotal.toFixed(2)}
               </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <GlassButton type="submit" className="px-8 py-3 w-full">Send Request</GlassButton>
        </div>
      </form>
    </GlassModal>
  );
}








