'use client';

import { ItemDisplay } from '@/lib/types';
import { useMemo, useRef, useState } from 'react';
import { MdOpenInNew } from 'react-icons/md';
import '../styles/store-links.css';

type Props = {
  item: ItemDisplay;
  showStores?: boolean;
  children?: React.ReactNode;
};

// Brief delay before collapsing so a quick mouse-out then -back (e.g.
// glancing pointer) doesn't snap the row shut mid-thought.
const COLLAPSE_DELAY_MS = 220;

export default function StoreLinks({
  item,
  showStores = true,
  children,
}: Props) {
  const stores = item.stores ?? [];
  const [expanded, setExpanded] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validStores = useMemo(
    () =>
      stores.filter(
        (s) => s?.name && s?.link && !Number.isNaN(Number(s.price))
      ),
    [stores]
  );

  const lowestPrice = useMemo(() => {
    if (!validStores.length) return null;
    return validStores.reduce((min, s) =>
      Number(s.price) < Number(min.price) ? s : min
    );
  }, [validStores]);

  if (!lowestPrice) {
    return children ? (
      <div className="item-action-row">{children}</div>
    ) : null;
  }

  const primary = lowestPrice;
  const extras = validStores.filter((s) => s !== primary);

  const cancelCollapse = () => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  };

  const scheduleCollapse = () => {
    cancelCollapse();
    collapseTimer.current = setTimeout(() => {
      setExpanded(false);
      collapseTimer.current = null;
    }, COLLAPSE_DELAY_MS);
  };

  return (
    <>
      <div className="item-price-row">
        <span className="item-price">
          ${Number(primary.price).toFixed(2)}
        </span>
      </div>
      {children}
      {showStores && (
        <>
          <div className="store-links-label-row">
            <span className="store-links-label from-label">
              from {primary.name}
            </span>
            {extras.length > 0 && (
              <span className="store-links-label">Buy on</span>
            )}
          </div>
          <div
            className={`storeLinks${expanded ? ' is-expanded' : ''}`}
            onMouseEnter={cancelCollapse}
            onMouseLeave={scheduleCollapse}
            onFocus={cancelCollapse}
            onBlur={(e) => {
              if (
                !e.currentTarget.contains(e.relatedTarget as Node | null)
              ) {
                scheduleCollapse();
              }
            }}
          >
            <a
              className="buy-link"
              href={primary.link}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {primary.name}
              <MdOpenInNew aria-hidden />
            </a>
            {/* Extras are always rendered so they can animate in / out
                via CSS. They're inert and zero-sized while collapsed. */}
            {extras.map((store) => (
              <a
                key={store.name}
                className="buy-link buy-link--extra"
                href={store.link}
                target="_blank"
                rel="noreferrer"
                tabIndex={expanded ? 0 : -1}
                aria-hidden={!expanded}
                onClick={(e) => e.stopPropagation()}
              >
                {store.name}
                <MdOpenInNew aria-hidden />
              </a>
            ))}
            {extras.length > 0 && (
              <button
                type="button"
                className="buy-link-more"
                onClick={(e) => {
                  e.stopPropagation();
                  cancelCollapse();
                  setExpanded(true);
                }}
                aria-label={`Show ${extras.length} more store${extras.length === 1 ? '' : 's'}`}
                aria-hidden={expanded}
                tabIndex={expanded ? -1 : 0}
              >
                +{extras.length}
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
