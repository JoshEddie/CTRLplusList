'use client';

import { useSyncExternalStore } from 'react';
import { FaChevronDown } from 'react-icons/fa';

function subscribeLocalStorage(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function useLocalStorageBool(key: string, defaultValue: boolean): [boolean, (v: boolean) => void] {
  const stored = useSyncExternalStore(
    subscribeLocalStorage,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null
  );
  const value = stored === null ? defaultValue : stored === 'true';
  const setValue = (next: boolean) => {
    try {
      window.localStorage.setItem(key, next ? 'true' : 'false');
      window.dispatchEvent(new StorageEvent('storage', { key }));
    } catch {}
  };
  return [value, setValue];
}

export default function CollapsibleRail({
  name,
  title,
  seeAllHref,
  headerExtra,
  children,
}: {
  name: string;
  title: string;
  seeAllHref?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useLocalStorageBool(`home.rail.${name}.open`, true);

  return (
    <section className={`rail rail-${name}${open ? '' : ' collapsed'}`}>
      <div className="rail-header">
        <button
          type="button"
          className="rail-toggle"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <FaChevronDown
            className={`rail-chevron${open ? '' : ' collapsed'}`}
          />
          <h2 className="rail-title">{title}</h2>
        </button>
        <div className="rail-header-extra">
          {headerExtra}
          {seeAllHref && (
            <a className="rail-see-all" href={seeAllHref}>
              See all
            </a>
          )}
        </div>
      </div>
      {open && <div className="rail-body">{children}</div>}
    </section>
  );
}
