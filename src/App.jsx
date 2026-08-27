import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BackgroundBlobs from './components/ui/BackgroundBlobs';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import SharedExpenses from './pages/SharedExpenses';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import Sidebar from './components/layout/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getQueuedOperations, clearQueuedOperation } from './utils/offlineSync';
import axios from 'axios';
import api from './utils/api';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 ml-64 max-h-screen overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function GlobalOfflineSyncManager() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      setIsSyncing(true);
      
      try {
        const queue = await getQueuedOperations();
        for (const op of queue) {
          try {
            await api({
              method: op.method,
              url: op.url,
              data: op.data
            });
            await clearQueuedOperation(op.id);
          } catch (e) {
            console.error("Failed to sync operation", op, e);
          }
        }
      } catch (e) {
        console.error("Failed to read sync queue", e);
      } finally {
        setIsSyncing(false);
      }
    };
    
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Attempt sync on mount if online
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !isSyncing) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
      <div className="glass px-4 py-3 rounded-xl flex items-center gap-3">
        {isOffline ? (
          <>
            <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Offline mode</span>
            <span className="text-xs text-slate-500 ml-2 border-l border-slate-300 dark:border-slate-700 pl-3">Changes will sync when you're back online.</span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Syncing changes...</span>
          </>
        )}
      </div>
    </div>
  );
}

function ThemeManager() {
  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'System';
    if (theme === 'Dark' || (theme === 'System' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ThemeManager />
          <BackgroundBlobs />
          <GlobalOfflineSyncManager />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
            <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
            <Route path="/shared-expenses" element={<ProtectedRoute><SharedExpenses /></ProtectedRoute>} />
            <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
