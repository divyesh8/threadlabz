'use client';

import React, { useState } from 'react';
import { STORE_CONFIG } from '@/lib/config';
import { Mail, Phone, MapPin, Send, Check } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center space-y-2">
        <div className="text-xs font-mono uppercase tracking-widest text-brand-lime">
          Support & Micro-Hub
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Get in Touch
        </h1>
        <p className="text-xs text-brand-gray">
          Have questions about a custom artwork print, delivery timing, or bulk studio orders?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5 bg-canvas-card border border-canvas-border rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white uppercase font-mono">
            Studio Contacts
          </h3>
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-brand-lime shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white">Bengaluru Studio & Factory</div>
                <div className="text-brand-gray mt-0.5">{STORE_CONFIG.support.address}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-brand-lime shrink-0" />
              <div>
                <div className="font-bold text-white">Direct Care Email</div>
                <div className="text-brand-gray mt-0.5">{STORE_CONFIG.support.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-brand-lime shrink-0" />
              <div>
                <div className="font-bold text-white">Studio Support Line</div>
                <div className="text-brand-gray mt-0.5">{STORE_CONFIG.support.phone}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-7 bg-canvas-card border border-canvas-border rounded-2xl p-6">
          {submitted ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 bg-brand-lime/10 text-brand-lime rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Message Dispatched!</h3>
              <p className="text-xs text-brand-gray">
                Our team will reply to <span className="text-white">{form.email}</span> within 4 business hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-xs font-bold text-white uppercase font-mono border-b border-canvas-border pb-2">
                Send a Message
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-brand-gray block mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-canvas-dark border border-canvas-border rounded-lg p-2.5 text-xs text-white focus:border-brand-lime outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-brand-gray block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-canvas-dark border border-canvas-border rounded-lg p-2.5 text-xs text-white focus:border-brand-lime outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-mono text-brand-gray block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Custom order / Print query / Shipping question"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full bg-canvas-dark border border-canvas-border rounded-lg p-2.5 text-xs text-white focus:border-brand-lime outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-brand-gray block mb-1">Message</label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-canvas-dark border border-canvas-border rounded-lg p-2.5 text-xs text-white focus:border-brand-lime outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-brand-lime hover:bg-brand-lime-hover text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-glow flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch Query
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
