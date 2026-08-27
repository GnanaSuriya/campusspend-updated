import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, Moon, Sun, Monitor } from 'lucide-react';

export default function Settings() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'System');

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'Dark' || (newTheme === 'System' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="space-y-6">
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

        <div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-bold rounded-xl transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
