'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Shield, User, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, switchRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email || 'customer@threadlab.in', 'customer');
    router.push('/account');
  };

  const handleDemoCustomer = () => {
    switchRole('customer');
    router.push('/account');
  };

  const handleDemoAdmin = () => {
    switchRole('admin');
    router.push('/admin');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-canvas-card border border-canvas-border rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-1">
          <div className="text-xs font-mono uppercase tracking-widest text-brand-lime">
            THREADLAB Passport
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Sign In to Account
          </h1>
          <p className="text-xs text-brand-gray">
            Access saved artworks, tracking timelines, and orders
          </p>
        </div>

        {/* Quick Demo Switchers */}
        <div className="p-3.5 bg-canvas-dark rounded-xl border border-canvas-border space-y-2 text-xs">
          <div className="font-mono text-brand-gray text-[10px] uppercase">
            ⚡ Quick 1-Click Demo Logins:
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDemoCustomer}
              className="flex-1 py-2 bg-canvas-subtle hover:bg-canvas-border border border-canvas-border text-white text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-brand-lime" />
              Demo Customer
            </button>
            <button
              type="button"
              onClick={handleDemoAdmin}
              className="flex-1 py-2 bg-brand-lime/10 hover:bg-brand-lime/20 border border-brand-lime/40 text-brand-lime text-xs font-mono font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              Demo Admin
            </button>
          </div>
        </div>

        {/* Regular Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-mono text-brand-gray block mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-canvas-dark border border-canvas-border rounded-lg p-3 text-xs text-white focus:border-brand-lime outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-mono text-brand-gray">Password</label>
              <span className="text-[10px] text-brand-gray hover:text-white cursor-pointer font-mono">
                Forgot?
              </span>
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-canvas-dark border border-canvas-border rounded-lg p-3 text-xs text-white focus:border-brand-lime outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-brand-lime hover:bg-brand-lime-hover text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-glow transition-all flex items-center justify-center gap-2"
          >
            Sign In to THREADLAB
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-brand-gray pt-2 border-t border-canvas-border">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={handleDemoCustomer}
            className="text-brand-lime hover:underline font-mono"
          >
            Join the Syndicate
          </button>
        </div>
      </div>
    </div>
  );
}
