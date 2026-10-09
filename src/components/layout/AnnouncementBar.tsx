'use client';

import React, { useState, useEffect } from 'react';
import { STORE_CONFIG } from '@/lib/config';

export function AnnouncementBar() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % STORE_CONFIG.announcements.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-brand-lime text-black py-2 px-4 text-[11px] sm:text-xs font-mono font-medium tracking-wide flex items-center justify-center transition-all duration-300">
      <div className="truncate text-center">
        {STORE_CONFIG.announcements[currentIndex]}
      </div>
    </div>
  );
}
