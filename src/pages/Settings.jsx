import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, Moon, Sun, Monitor, AlertTriangle } from 'lucide-react';
import { GlassModal, GlassButton, GlassInput } from '../components/ui';
import api from '../utils/api';

export default function Settings() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'System');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'Dark' || (newTheme === 'System' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleResetData = async (e) => {
    e.preventDefault();
    if (!resetPassword) {
      setResetError("Password is required.");
      return;
    }
    
    setIsResetting(true);
    setResetError('');
    
    try {
      const res = await api.delete('/auth/reset', { data: { password: resetPassword } });
      if (res.data.success) {
        setIsResetModalOpen(false);
        // Force reload to clear memory and re-fetch clean state
        window.location.reload();
      } else {
        setResetError(res.data.error || "Failed to reset data.");
      }
    } catch (err) {
      setResetError(err.response?.data?.error || "Invalid password.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300">
          Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Manage your account and preferences.</p>
      </div>

      <div className="glass p-8 rounded-2xl space-y-8">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <User className="text-primary-500" size={24} />
            Profile Information
          </h2>
          <div className="space-y-4 ml-8">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Name</p>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{user.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Email Address</p>
              <p className="text-lg text-slate-800 dark:text-slate-200">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Student Type</p>
              <p className="text-lg text-slate-800 dark:text-slate-200">{user.student_type}</p>
            </div>
          </div>
        </div>
        
        <div className="h-px bg-slate-200 dark:bg-slate-700/50"></div>

        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
            Appearance
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 ml-8">
            <button 
              onClick={() => handleThemeChange('Light')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${theme === 'Light' ? 'bg-primary-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              <Sun size={18} /> Light
            </button>
            <button 
              onClick={() => handleThemeChange('Dark')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${theme === 'Dark' ? 'bg-primary-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              <Moon size={18} /> Dark
            </button>
            <button 
              onClick={() => handleThemeChange('System')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${theme === 'System' ? 'bg-primary-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              <Monitor size={18} /> System
            </button>
          </div>
        </div>

        <div className="h-px bg-slate-200 dark:bg-slate-700/50"></div>
        
        {/* Danger Zone */}
        <div>
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <AlertTriangle size={24} />
            Danger Zone
          </h2>
          <div className="ml-8 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Permanently delete all your transactions, budgets, and shared expenses. This action cannot be undone.
            </p>
            <button 
              onClick={() => setIsResetModalOpen(true)}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-sm"
            >
              Reset Data
            </button>
          </div>
        </div>
        
        <div className="h-px bg-slate-200 dark:bg-slate-700/50"></div>

        <div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </div>

      <GlassModal isOpen={isResetModalOpen} onClose={() => { setIsResetModalOpen(false); setResetError(''); setResetPassword(''); }} title="Confirm Reset Data">
        <form onSubmit={handleResetData} className="flex flex-col gap-4 mt-2">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl">
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">
              Warning: This will delete ALL your financial data. Enter your password to proceed.
            </p>
          </div>
          
          <GlassInput 
            type="password"
            placeholder="Enter your password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            required
            autoFocus
          />
          
          {resetError && <p className="text-red-500 text-sm font-medium">{resetError}</p>}
          
          <div className="flex gap-3 mt-4">
            <GlassButton type="button" onClick={() => { setIsResetModalOpen(false); setResetError(''); setResetPassword(''); }} className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
              Cancel
            </GlassButton>
            <GlassButton type="submit" disabled={isResetting || !resetPassword} className="flex-1 bg-red-500 hover:bg-red-600 text-white border-transparent">
              {isResetting ? 'Resetting...' : 'Confirm Reset'}
            </GlassButton>
          </div>
        </form>
      </GlassModal>

    </div>
  );
}
