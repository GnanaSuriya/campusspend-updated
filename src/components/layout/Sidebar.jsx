import React from 'react';
import { NavLink } from 'react-router-dom';
import Logo from '../ui/Logo';
import { Home, List, PieChart, Users, TrendingUp, Settings } from 'lucide-react';

export default function Sidebar() {
  const links = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/transactions', icon: List, label: 'Transactions' },
    { to: '/budgets', icon: PieChart, label: 'Budgets' },
    { to: '/shared-expenses', icon: Users, label: 'Shared Expenses' },
    { to: '/insights', icon: TrendingUp, label: 'Insights' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 glass border-r-0 rounded-none rounded-r-3xl flex flex-col py-8 px-4 z-40">
      <div className="flex items-center gap-3 px-4 mb-10">
        <Logo className="w-10 h-10" />
        <span className="text-xl font-extrabold text-slate-800 tracking-tight">CampusSpend</span>
      </div>
      
      <nav className="flex-1 flex flex-col gap-2">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                isActive 
                  ? 'bg-primary-500/10 text-primary-700 shadow-sm' 
                  : 'text-slate-600 hover:bg-white/40 hover:text-slate-800'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
