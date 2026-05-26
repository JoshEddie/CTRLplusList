'use client';

import { useSearchParams } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa6';

const HERO_PARAM = 'hero';
const HERO_CLOSED = 'closed';

export default function HeroCollapseShell({
  children,
  title,
  collapsedKebab,
}: {
  children: ReactNode;
  title: string;
  collapsedKebab: ReactNode;
}) {
  const params = useSearchParams();
  const [collapsed, setCollapsed] = useState(
    params.get(HERO_PARAM) === HERO_CLOSED
  );

  // replaceState, not pushState — toggling must not pollute browser history.
  // Back-button should return to the previous page, never unwind toggles.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (collapsed) {
      url.searchParams.set(HERO_PARAM, HERO_CLOSED);
    } else {
      url.searchParams.delete(HERO_PARAM);
    }
    window.history.replaceState(null, '', url);
  }, [collapsed]);

  const toggleLabel = collapsed ? 'Expand list info' : 'Collapse list info';

  return (
    <div
      className={`list-hero-shell${collapsed ? ' list-hero-shell-collapsed' : ''}`}
    >
      {collapsed ? (
        <div
          className="list-hero-grid list-hero-collapsed-strip"
          role="button"
          tabIndex={0}
          aria-expanded={false}
          aria-label={toggleLabel}
          onClick={() => setCollapsed(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setCollapsed(false);
            }
          }}
        >
          <FaChevronDown aria-hidden className="list-hero-collapsed-chevron" />
          <h1 className="list-hero-collapsed-title">{title}</h1>
          {/* Kebab is an exclusion zone — its clicks must NOT bubble up
              to the strip's expand handler, otherwise opening the menu
              would also expand the hero. */}
          <div
            className="list-hero-collapsed-trailing"
            onClick={(e) => e.stopPropagation()}
          >
            {collapsedKebab}
          </div>
        </div>
      ) : (
        <>
          {children}
          <button
            type="button"
            className="list-hero-collapse-handle"
            onClick={() => setCollapsed(true)}
            aria-expanded={true}
            aria-label={toggleLabel}
          >
            <FaChevronUp aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
