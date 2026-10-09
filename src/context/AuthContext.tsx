'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'customer' | 'admin';
  address?: {
    addressLine: string;
    city: string;
    state: string;
    pinCode: string;
  };
}

const DEMO_CUSTOMER: UserProfile = {
  id: 'usr_demo_1',
  email: 'arjun.sharma@example.com',
  fullName: 'Arjun Sharma',
  phone: '+91 98765 43210',
  role: 'customer',
  address: {
    addressLine: 'Flat 402, Skyline Residency, 12th Main Road, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560038',
  },
};

const DEMO_ADMIN: UserProfile = {
  id: 'usr_admin_1',
  email: 'admin@threadlab.in',
  fullName: 'ThreadLab Operations Lead',
  phone: '+91 80412 38890',
  role: 'admin',
};

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  login: (email: string, role?: 'customer' | 'admin') => void;
  logout: () => void;
  switchRole: (role: 'customer' | 'admin' | 'guest') => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(DEMO_CUSTOMER);
  const [wishlist, setWishlist] = useState<string[]>(['prod_tee_heavy', 'prod_hoodie_heavy']);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('threadlab_current_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      const storedWishlist = localStorage.getItem('threadlab_wishlist');
      if (storedWishlist) {
        setWishlist(JSON.parse(storedWishlist));
      }
    } catch {
      // fallback
    }
  }, []);

  const login = (email: string, role: 'customer' | 'admin' = 'customer') => {
    const newUser: UserProfile =
      role === 'admin'
        ? { ...DEMO_ADMIN, email }
        : { ...DEMO_CUSTOMER, email, fullName: email.split('@')[0] };
    setUser(newUser);
    try {
      localStorage.setItem('threadlab_current_user', JSON.stringify(newUser));
    } catch {}
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('threadlab_current_user');
    } catch {}
  };

  const switchRole = (role: 'customer' | 'admin' | 'guest') => {
    if (role === 'admin') {
      setUser(DEMO_ADMIN);
      localStorage.setItem('threadlab_current_user', JSON.stringify(DEMO_ADMIN));
    } else if (role === 'customer') {
      setUser(DEMO_CUSTOMER);
      localStorage.setItem('threadlab_current_user', JSON.stringify(DEMO_CUSTOMER));
    } else {
      setUser(null);
      localStorage.removeItem('threadlab_current_user');
    }
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      try {
        localStorage.setItem('threadlab_wishlist', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin',
        login,
        logout,
        switchRole,
        wishlist,
        toggleWishlist,
        isInWishlist,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
