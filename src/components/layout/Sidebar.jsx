import React from 'react';
import { NavLink } from 'react-router-dom';
import Logo from '../ui/Logo';
import { Home, List, PieChart, Users, TrendingUp, Settings } from 'lucide-react';

export default function Sidebar() {
  const links = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/transactions', icon: List, label: 'Transactions' },
    { to: '/budgets', icon: PieChart, label: 'Budgets' },
    { to: '/shared-expenses', icon: Users, label: 'Shared' },
    { to: '/insights', icon: TrendingUp, label: 'Insights' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-screen w-64 glass border-r-0 rounded-none rounded-r-3xl flex-col py-8 px-4 z-40">
        <div className="flex items-center gap-3 px-4 mb-10">
          <Logo className="w-10 h-10" />
          <span className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">CampusSpend</span>
        </div>
        
        <nav className="flex-1 flex flex-col gap-2">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  isActive 
                    ? 'bg-primary-500/10 text-primary-700 dark:text-primary-400 shadow-sm' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full glass border-t border-white/20 dark:border-slate-800/50 rounded-none z-50 flex items-center justify-around px-2 py-3 pb-4">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`
            }
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

