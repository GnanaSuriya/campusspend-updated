import React, { useState } from 'react';
import { GlassCard, GlassButton, GlassInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { LogOut } from 'lucide-react';

export default function Settings() {
  const { user, logout, setUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user.name,
    student_type: user.student_type,
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const dataToSubmit = { name: formData.name, student_type: formData.student_type };
      if (formData.password) {
        if (formData.password.length < 6) {
          setMessage("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        dataToSubmit.password = formData.password;
      }
      
      const res = await api.patch('/auth/me', dataToSubmit);
      if (res.data.success) {
        setUser(res.data.data);
        setMessage("Profile updated successfully!");
        setFormData({ ...formData, password: '' });
      }
    } catch (err) {
      setMessage("Error updating profile");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Settings</h1>
          <p className="text-slate-600 mt-1">Manage your account</p>
        </div>
        <GlassButton variant="danger" onClick={logout}>
          <LogOut size={20} /> Logout
        </GlassButton>
      </header>

      <div className="max-w-2xl">
        <GlassCard>
          <h2 className="text-xl font-bold text-slate-800 mb-6">Profile Information</h2>
          
          {message && (
            <div className={`mb-6 p-4 rounded-xl ${message.includes('Error') ? 'bg-red-500/10 text-red-600' : 'bg-mint-500/10 text-mint-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Email Address</label>
              <GlassInput type="email" value={user.email} disabled className="opacity-70 cursor-not-allowed" />
              <p className="text-xs text-slate-500">Email cannot be changed.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Full Name</label>
              <GlassInput name="name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Student Type</label>
              <select 
                name="student_type" 
                value={formData.student_type} 
                onChange={handleChange} 
                className="w-full px-4 py-3 rounded-xl glass-input text-slate-800"
              >
                <option value="Hosteller">Hosteller</option>
                <option value="Day Scholar">Day Scholar</option>
              </select>
              <p className="text-xs text-slate-500">Warning: Changing this will update your available expense categories.</p>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-slate-200/50">
              <label className="text-sm font-bold text-slate-700">Change Password</label>
              <GlassInput 
                type="password" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                placeholder="Leave blank to keep current password"
              />
            </div>

            <GlassButton type="submit" className="mt-4 self-start px-8" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </GlassButton>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
