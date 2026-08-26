import React, { useState } from 'react';
import Logo from '../components/ui/Logo';
import { GlassButton } from '../components/ui';
import AuthModal from '../components/auth/AuthModal';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function LandingPage() {
  const [authModal, setAuthModal] = useState({ isOpen: false, view: 'login' });
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const openAuth = (view) => setAuthModal({ isOpen: true, view });
  const closeAuth = () => setAuthModal({ ...authModal, isOpen: false });

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <header className="px-8 py-6 flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-2xl font-extrabold text-slate-800 tracking-tight">CampusSpend</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => openAuth('login')}
            className="font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Log In
          </button>
          <GlassButton onClick={() => openAuth('signup')}>
            Sign Up
          </GlassButton>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-3xl mx-auto mt-[-10vh]">
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8">
            The smart way to track your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600">campus expenses.</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Whether you're a Hosteller or a Day Scholar, take control of your budget, split bills with friends, and get insights on your spending habits.
          </p>
          <div className="flex items-center justify-center gap-6">
            <GlassButton className="px-8 py-4 text-lg" onClick={() => openAuth('signup')}>
              Get Started for Free
            </GlassButton>
          </div>
        </div>
      </main>

      <AuthModal 
        isOpen={authModal.isOpen} 
        onClose={closeAuth} 
        initialView={authModal.view}
        onSwitchView={(view) => setAuthModal({ ...authModal, view })}
      />
    </div>
  );
}
