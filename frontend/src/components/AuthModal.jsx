import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Cpu,
  Layers,
  X,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const { loginWithGoogle } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      if (!credentialResponse?.credential) {
        throw new Error('No credential received from Google.');
      }
      const loggedInUser = await loginWithGoogle(credentialResponse.credential);
      if (onLoginSuccess) {
        onLoginSuccess(loggedInUser);
      }
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Google sign-in failed. Please verify server configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrorMessage('Google Sign-In was cancelled or failed to initialize.');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (authMode === 'register' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setErrorMessage('Please use "Sign in with Google" to authenticate and access all unified AI providers.');
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal-card">
        {/* Top Header */}
        <div className="auth-modal-header">
          <div className="auth-logo-badge">
            <Cpu size={24} className="text-indigo-400" />
          </div>
          <button
            type="button"
            className="auth-close-btn"
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="auth-modal-body">
          <div className="auth-title-section">
            <h2 className="auth-main-title">
              Sign In to AI Hub
            </h2>
            <p className="auth-subtitle">
              Sign in with your Google account to instantly unlock all developer AI providers: Claude 3.7, Gemini 3.8, DeepSeek R1, GPT-4o, Mistral & Groq.
            </p>
          </div>

          {errorMessage && (
            <div className="auth-error-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Social Sign-In Options - Real Google GIS Button */}
          {(!import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID === 'your-google-client-id.apps.googleusercontent.com') ? (
            <div style={{
              margin: '16px 0',
              padding: '16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              fontSize: '0.82rem',
              color: '#fca5a5',
              lineHeight: 1.5
            }}>
              <strong style={{ color: '#f87171', display: 'block', marginBottom: 4 }}>⚠️ Google Client ID Not Set</strong>
              Please configure <code style={{ color: '#fef08a', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: 4 }}>VITE_GOOGLE_CLIENT_ID</code> in <code style={{ color: '#fef08a', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: 4 }}>frontend/.env</code> and restart Vite.
            </div>
          ) : (
            <div className="auth-social-buttons" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_black"
                  size="large"
                  shape="rectangular"
                  text="continue_with"
                  width="340"
                />
              </div>
            </div>
          )}

          <div className="auth-separator">
            <span>Server-side Managed Keys</span>
          </div>

          {/* Quick Perks Indicator */}
          <div className="auth-features-strip">
            <div className="auth-feature-pill">
              <CheckCircle size={13} className="text-emerald-400" />
              <span>Gemini 3.8 & Flash</span>
            </div>
            <div className="auth-feature-pill">
              <CheckCircle size={13} className="text-emerald-400" />
              <span>Claude 3.7 & GPT-4o</span>
            </div>
            <div className="auth-feature-pill">
              <CheckCircle size={13} className="text-emerald-400" />
              <span>DeepSeek R1 & Groq</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="auth-modal-footer">
            <ShieldCheck size={14} className="text-indigo-400" />
            <span>Zero API keys required in browser. Unified secure developer session.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
