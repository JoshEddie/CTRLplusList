'use client';

import { Button, LinkButton } from '@/app/ui/components/button';
import { Menu, MenuLinkItem } from '@/app/ui/components/menu';
import { ItemStoreTable } from '@/lib/types';
import { useMemo, useRef } from 'react';
import { MdOpenInNew } from 'react-icons/md';
import '../../styles/store-links.css';
import {
  formatStorePrice,
  sortedValidStores,
  useHoverOpenMenu,
} from '../utils';

export default function ModalStoreRow({
  stores,
}: {
  stores: ItemStoreTable[] | null | undefined;
}) {
  const { open, setOpen, cancelCollapseAndOpen, scheduleCollapse } =
    useHoverOpenMenu();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sorted = useMemo(() => sortedValidStores(stores), [stores]);

  if (sorted.length === 0) return null;

  const primary = sorted[0];
  const extras = sorted.length - 1;

  return (
    <div className="modal-store-row">
      <LinkButton
        variant="ghost"
        className="storeLinks-link modal-store-row-link"
        href={primary.link}
        target="_blank"
        rel="noreferrer"
      >
        {primary.name} · {formatStorePrice(primary.price)}
        <MdOpenInNew aria-hidden />
      </LinkButton>
      {extras > 0 && (
        <div
          className="modal-store-row-more-anchor"
          onMouseEnter={cancelCollapseAndOpen}
          onMouseLeave={scheduleCollapse}
        >
          <Button
            ref={triggerRef}
            variant="ghost"
            className="storeLinks-more modal-store-row-more"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            +{extras} store{extras === 1 ? '' : 's'}
          </Button>
          <Menu
            open={open}
            onClose={() => setOpen(false)}
            anchorRef={triggerRef}
            aria-label="All stores with prices"
          >
            {sorted.map((store) => (
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
  );
}
