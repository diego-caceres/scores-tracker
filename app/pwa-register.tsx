'use client';

import { useEffect } from 'react';

export function PWARegister(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      return;
    }

    void navigator.serviceWorker.register('/sw.js');
  }, []);

  return null;
}
