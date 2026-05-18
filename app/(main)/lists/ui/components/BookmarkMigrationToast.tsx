'use client';

import { useSyncExternalStore } from 'react';

const KEY = 'home.bookmark-migration-toast.dismissed';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export default function BookmarkMigrationToast() {
  const dismissed = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(KEY) === 'true';
      } catch {
        return false;
      }
    },
    () => true // SSR: hide to avoid flash before hydration
  );

  if (dismissed) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(KEY, 'true');
      window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    } catch {}
  };

  return (
    <div className="bookmark-migration-toast" role="status">
      <span>Saved lists are now Bookmarks — find them in the new section.</span>
      <button
        type="button"
        className="bookmark-migration-toast-dismiss"
        onClick={dismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
