import React, { useState, useEffect } from 'react';
import { GlassModal, GlassInput, GlassButton } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Logo from '../ui/Logo';

export default function AuthModal({ isOpen, onClose, initialView = 'login', onSwitchView }) {
  const [view, setView] = useState(initialView);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', student_type: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setView(initialView);
    setError('');
    setFormData({ name: '', email: '', password: '', confirmPassword: '', student_type: '' });
  }, [initialView, isOpen]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (view === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords don't match");
        setLoading(false);
        return;
      }
      if (!formData.student_type) {
        setError("Please select if you are a Hosteller or Day Scholar");
        setLoading(false);
        return;
      }
      const res = await register(formData);
      if (res.success) {
        onClose();
        navigate('/dashboard');
      } else {
        setError(res.error);
      }
    } else {
      const res = await login(formData.email, formData.password);
      if (res.success) {
        onClose();
        navigate('/dashboard');
      } else {
        setError(res.error);
      }
    }
    setLoading(false);
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center mb-6">
        <Logo className="w-12 h-12 mb-4" />
        <h2 className="text-2xl font-extrabold text-slate-800">
          {view === 'login' ? 'Welcome Back' : 'Create an Account'}
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {view === 'signup' && (
          <GlassInput 
            name="name" 
            placeholder="Full Name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
          />
        )}
        
        <GlassInput 
          type="email" 
          name="email" 
          placeholder="Email Address" 
          value={formData.email} 
          onChange={handleChange} 
          required 
        />
        
        <GlassInput 
          type="password" 
          name="password" 
          placeholder="Password" 
          value={formData.password} 
          onChange={handleChange} 
          required 
          minLength={6}
        />

        {view === 'signup' && (
          <>
            <GlassInput 
              type="password" 
              name="confirmPassword" 
              placeholder="Confirm Password" 
              value={formData.confirmPassword} 
              onChange={handleChange} 
              required 
            />
            
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-sm font-medium text-slate-600">I am a:</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="student_type" 
                    value="Hosteller" 
                    checked={formData.student_type === 'Hosteller'}
                    onChange={handleChange}
                    className="accent-primary-600"
                  />
                  <span className="text-sm">Hosteller</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="student_type" 
                    value="Day Scholar" 
                    checked={formData.student_type === 'Day Scholar'}
                    onChange={handleChange}
                    className="accent-primary-600"
                  />
                  <span className="text-sm">Day Scholar</span>
                </label>
              </div>
            </div>
          </>
        )}

        <GlassButton type="submit" className="mt-4 w-full" disabled={loading}>
          {loading ? 'Processing...' : (view === 'login' ? 'Log In' : 'Sign Up')}
        </GlassButton>
      </form>

      <div className="mt-6 text-center text-sm text-slate-600">
        {view === 'login' ? (
          <>Don't have an account? <button onClick={() => onSwitchView('signup')} className="text-primary-600 font-bold hover:underline">Sign up</button></>
        ) : (
          <>Already have an account? <button onClick={() => onSwitchView('login')} className="text-primary-600 font-bold hover:underline">Log in</button></>
        )}
      </div>
    </GlassModal>
  );
}
