'use client';

import { useEffect, useRef } from 'react';
import type { Notification } from '@/lib/notification-api';

const BASE_TITLE = 'CliniqFlow';

function formatTitle(unreadCount: number): string {
  if (unreadCount <= 0) return BASE_TITLE;
  const label = unreadCount > 99 ? '99+' : String(unreadCount);
  return `(${label}) ${BASE_TITLE}`;
}

function showBrowserNotification(notification: Notification): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const instance = new Notification(notification.title, {
      body: notification.body,
      tag: notification.id,
    });
    instance.onclick = () => {
      window.focus();
      instance.close();
    };
  } catch {
    // Browser may block notifications in some contexts
  }
}

export function useNotificationAttention(unreadCount: number, hasNewAlert: boolean) {
  const originalTitle = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (originalTitle.current === null) {
      originalTitle.current = document.title;
    }
    document.title = formatTitle(unreadCount);
    return () => {
      document.title = originalTitle.current ?? BASE_TITLE;
    };
  }, [unreadCount]);

  return { showBrowserNotification };
}

export function requestNotificationPermission(): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    void Notification.requestPermission();
  }
}

export { formatTitle as formatNotificationTitle };
