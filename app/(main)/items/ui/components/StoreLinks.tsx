'use client';

import { Button, LinkButton } from '@/app/ui/components/button';
import { Menu, MenuLinkItem } from '@/app/ui/components/menu';
import { ItemDisplay } from '@/lib/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MdOpenInNew } from 'react-icons/md';
import '../styles/store-links.css';
import {
  formatStorePrice,
  sortedValidStores,
  useHoverOpenMenu,
} from './utils';

// Each menu row is ~36px tall (.menu-item: 10px+10px padding + 14px font).
// Used to estimate panel height for placement decisions before render.
const MENU_ROW_HEIGHT_PX = 36;
const MENU_PADDING_PX = 12; // .menu-popover padding 6px top/bottom
const TRIGGER_GAP_PX = 6; // .menu-popover top/bottom offset

type Props = {
  item: ItemDisplay;
  showStores?: boolean;
};

export default function StoreLinks({ item, showStores = true }: Props) {
  const { open, setOpen, cancelCollapseAndOpen, scheduleCollapse } =
    useHoverOpenMenu();
  const [placement, setPlacement] = useState<'above' | 'below'>('above');
  const triggerRef = useRef<HTMLButtonElement>(null);

  const sortedStores = useMemo(
    () => sortedValidStores(item.stores),
    [item.stores]
  );

  const lowestPrice = sortedStores[0] ?? null;

  // Pick placement based on available space in the nearest clipping
  // ancestor. Prefer above (matches the user-stated default of "cover
  // the item"), but flip below when there's not enough room above —
  // especially relevant for top-row items in the list view.
  const computePlacement = useCallback(() => {
    const trigger = triggerRef.current;
    /* v8 ignore next -- defensive: triggerRef is always set when the trigger has mounted; the effect that calls this is gated on `open`, which only becomes true while the trigger Button is rendered. */
    if (!trigger) return;
    const tRect = trigger.getBoundingClientRect();
    let containerTop = 0;
    let containerBottom = window.innerHeight;
    let el: HTMLElement | null = trigger.parentElement;
    while (el && el !== document.body) {
      const overflow = getComputedStyle(el).overflowY;
      if (
        overflow === 'auto' ||
        overflow === 'scroll' ||
        overflow === 'hidden'
      ) {
        const r = el.getBoundingClientRect();
        containerTop = r.top;
        containerBottom = r.bottom;
        break;
      }
      el = el.parentElement;
    }
    const panelHeight =
      sortedStores.length * MENU_ROW_HEIGHT_PX +
      MENU_PADDING_PX +
      TRIGGER_GAP_PX;
    const roomAbove = tRect.top - containerTop;
    const roomBelow = containerBottom - tRect.bottom;
    setPlacement(
      roomAbove >= panelHeight || roomAbove >= roomBelow ? 'above' : 'below'
    );
  }, [sortedStores.length]);

  useEffect(() => {
    if (open) computePlacement();
  }, [open, computePlacement]);

  if (!lowestPrice) {
    return null;
  }

  const primary = lowestPrice;
  const extras = sortedStores.slice(1);
  const hasExtras = extras.length > 0;

  return (
    <>
      <div className="item-price-row">
        <span className="item-price">{formatStorePrice(primary.price)}</span>
      </div>
      {showStores && (
        <>
          <div className={`storeLinks${hasExtras ? ' has-extras' : ''}`}>
            <LinkButton
              variant="primary"
              className="storeLinks-link"
              href={primary.link}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {primary.name}
              <MdOpenInNew aria-hidden />
            </LinkButton>
            {hasExtras && (
              <div
                className={`storeLinks-more-anchor placement-${placement}`}
                onMouseEnter={cancelCollapseAndOpen}
                onMouseLeave={scheduleCollapse}
              >
                <Button
                  ref={triggerRef}
                  variant="ghost"
                  className="storeLinks-more"
                  aria-haspopup="menu"
                  aria-expanded={open}
                  aria-label={`Show ${extras.length} more store${extras.length === 1 ? '' : 's'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen((o) => !o);
                  }}
                >
                  +{extras.length}
                </Button>
                <Menu
                  open={open}
                  onClose={() => setOpen(false)}
                  anchorRef={triggerRef}
                  aria-label="All stores with prices"
                >
                  {sortedStores.map((store) => (
                    <MenuLinkItem
                      key={store.name}
                      href={store.link}
                      target="_blank"
                      rel="noreferrer"
                      className="storeLinks-menu-item"
                      onClick={() => setOpen(false)}
                    >
                      <span className="storeLinks-menu-name">{store.name}</span>
                      <span className="storeLinks-menu-price">
                        {formatStorePrice(store.price)}
                      </span>
                    </MenuLinkItem>
                  ))}
                </Menu>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
