"use client";
import React, { Suspense, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseIIITNREmail } from '@/lib/identity-parser';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

// Inner component — uses useSearchParams so must be inside Suspense
function AuthForm() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errParam = searchParams.get('error');
    if (errParam === 'invalid_domain') {
      setError('Only @iiitnr.edu.in emails are allowed.');
    } else if (errParam === 'auth_failed') {
      setError('Authentication failed. Please try again.');
    }
  }, [searchParams]);

  const parsedPreview = email ? parseIIITNREmail(email) : null;

  async function handleGoogleLogin() {
    setError('');
    setGoogleLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
      // If no error, browser will redirect to Google
    } catch (err: any) {
      setError(err.message);
      setGoogleLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email.endsWith('@iiitnr.edu.in')) {
      setError('Only @iiitnr.edu.in emails are allowed.');
      setLoading(false);
      return;
    }

    if (!parseIIITNREmail(email)) {
      setError('Invalid email format. Expected: nameYYCCC@iiitnr.edu.in');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed.');
      } else {
        setSuccess('Registered! Check your email for confirmation, then log in.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(180,100%,50%), transparent)' }}
          animate={{ x: [0, 100, -50, 0], y: [0, -80, 60, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          initial={{ top: '10%', left: '10%' }}
        />
        <motion.div
          className="absolute w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(280,100%,65%), transparent)' }}
          animate={{ x: [0, -80, 100, 0], y: [0, 60, -50, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          initial={{ bottom: '10%', right: '10%' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-panel rounded-3xl p-8 sm:p-10 w-full max-w-md relative z-10 border border-gray-800"
      >
        <h1 className="text-3xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-neonCyan to-neonPurple">
          UniConnect
        </h1>
        <p className="text-gray-500 text-center text-sm mb-6">IIIT Naya Raipur</p>

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-700 bg-gray-900 hover:bg-gray-800 transition-all text-white text-sm font-medium disabled:opacity-50 mb-6"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        {/* Guest Demo Login Button for Recruiters */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setEmail('demo25102@iiitnr.edu.in');
            setPassword('demo1234');
            setIsRegister(false);
            // We use setTimeout to allow state to update before submitting
            setTimeout(() => {
              const form = document.getElementById('auth-form') as HTMLFormElement;
              if (form) form.requestSubmit();
            }, 100);
          }}
          type="button"
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-neonCyan/50 bg-neonCyan/10 hover:bg-neonCyan/20 transition-all text-neonCyan text-sm font-semibold mb-6"
        >
          Guest Demo Login (Recruiters)
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-xs text-gray-600 uppercase tracking-wider">or use email</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Toggle */}
        <div className="flex rounded-xl bg-gray-900 p-1 mb-6">
          <button
            onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${!isRegister ? 'bg-neonCyan text-black' : 'text-gray-400 hover:text-white'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${isRegister ? 'bg-neonPurple text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Register
          </button>
        </div>

        <form id="auth-form" onSubmit={isRegister ? handleRegister : handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">College Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name25102@iiitnr.edu.in"
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-neonCyan transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-neonCyan transition-colors"
            />
          </div>

          {/* Live identity preview during registration */}
          <AnimatePresence>
            {isRegister && parsedPreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="glass-panel rounded-xl p-4 neon-border-cyan text-sm space-y-1">
                  <p className="text-neonCyan font-semibold text-xs uppercase tracking-wider mb-2">Identity Parsed</p>
                  <p className="text-gray-300">Handle: <span className="text-white font-medium">@{parsedPreview.handle}</span></p>
                  <p className="text-gray-300">Batch: <span className="text-white font-medium">{parsedPreview.batch_year}</span></p>
                  <p className="text-gray-300">Branch: <span className="text-white font-medium">{parsedPreview.branch_name} ({parsedPreview.branch_code})</span></p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm bg-red-900/20 rounded-lg p-3 border border-red-800">
              {error}
            </motion.p>
          )}
          {success && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-400 text-sm bg-green-900/20 rounded-lg p-3 border border-green-800">
              {success}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 bg-gradient-to-r from-neonCyan to-neonPurple text-black hover:shadow-neonCyan"
          >
            {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-gray-600 text-center mt-6">
          By continuing, you agree to UniConnect&apos;s terms of service.
        </p>
      </motion.div>
    </main>
  );
}

// Default export wraps in Suspense to satisfy Next.js static build requirements
export default function AuthPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-neonCyan border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <AuthForm />
    </Suspense>
  );
}
