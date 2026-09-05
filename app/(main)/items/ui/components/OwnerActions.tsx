'use client';

import { Button } from '@/app/ui/components/button';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { Menu, MenuItem, MenuLinkItem } from '@/app/ui/components/menu';
import { archiveItem } from '@/lib/data/item.actions';
import {
  removeListItem,
  setListItemQuantity,
} from '@/lib/data/listItems.actions';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MdArchive,
  MdModeEdit,
  MdMoreHoriz,
  MdNumbers,
  MdRemoveCircleOutline,
  MdUnarchive,
} from 'react-icons/md';
import QuantityDialog from './QuantityDialog';

export default function OwnerActions({
  itemId,
  showArchiveAction,
  archivedView,
  listId,
  quantity,
  pathname,
  searchParams,
  onChanged,
}: {
  itemId: string;
  showArchiveAction?: boolean;
  archivedView?: boolean;
  listId?: string;
  /** The entry's quantity, present with `listId` — the only place it is set. */
  quantity?: number;
  pathname: string;
  searchParams: ReadonlyURLSearchParams | null;
  onChanged: () => void;
}) {
  const kebabRef = useRef<HTMLButtonElement>(null);
  const [kebabOpen, setKebabOpen] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showQuantity, setShowQuantity] = useState(false);

  const toggleArchive = async () => {
    const nextArchived = !archivedView;
    const result = await toast.promise(archiveItem(itemId, nextArchived), {
      loading: nextArchived ? 'Archiving' : 'Unarchiving',
      success: nextArchived ? 'Archived' : 'Unarchived',
      error: 'Failed',
    });
    if (result?.success) onChanged();
  };

  const handleRemoveConfirm = async () => {
    /* v8 ignore next -- defensive: the Remove menu entry and its dialog only render when listId is present. */
    if (!listId) return;
    setShowRemoveConfirm(false);
    const result = await toast.promise(removeListItem(listId, itemId), {
      loading: 'Removing',
      success: 'Removed from list',
      error: 'Failed to remove',
    });
    if (result?.success) onChanged();
  };

  const handleQuantitySave = async (next: number) => {
    /* v8 ignore next -- defensive: the Quantity menu entry and its dialog only render when listId is present. */
    if (!listId) return;
    const result = await toast.promise(
      setListItemQuantity(listId, itemId, next),
      {
        loading: 'Saving',
        success: 'Quantity updated',
        error: 'Failed to update quantity',
      }
    );
    if (result?.success) onChanged();
  };

  return (
    <div className="item-owner-actions-mobile">
      <Button
        ref={kebabRef}
        variant="ghost"
        className="item-owner-actions-kebab"
        aria-haspopup="menu"
        aria-expanded={kebabOpen}
        aria-label="Item actions"
        onClick={() => setKebabOpen((o) => !o)}
      >
        <MdMoreHoriz />
      </Button>
      <Menu
        open={kebabOpen}
        onClose={() => setKebabOpen(false)}
        anchorRef={kebabRef}
        aria-label="Item actions"
      >
        <MenuLinkItem
          href={`/items/${itemId}?returnTo=${encodeURIComponent(
            pathname +
              (searchParams?.toString() ? `?${searchParams.toString()}` : '')
          )}`}
          icon={<MdModeEdit size={18} />}
          onClick={() => setKebabOpen(false)}
        >
          Edit
        </MenuLinkItem>
        {showArchiveAction && (
          <MenuItem
            icon={
              archivedView ? <MdUnarchive size={18} /> : <MdArchive size={18} />
            }
            onClick={async () => {
              setKebabOpen(false);
              await toggleArchive();
            }}
          >
            {archivedView ? 'Unarchive' : 'Archive'}
          </MenuItem>
        )}
        {listId && (
          <MenuItem
            icon={<MdNumbers size={18} />}
            onClick={() => {
              setKebabOpen(false);
              setShowQuantity(true);
            }}
          >
            Quantity
          </MenuItem>
        )}
        {listId && (
          <MenuItem
            tone="danger"
            icon={<MdRemoveCircleOutline size={18} />}
            onClick={() => {
              setKebabOpen(false);
              setShowRemoveConfirm(true);
            }}
          >
            Remove from list
          </MenuItem>
        )}
      </Menu>
      {showQuantity && (
        <QuantityDialog
          quantity={quantity ?? 1}
          onClose={() => setShowQuantity(false)}
          onSave={handleQuantitySave}
        />
      )}
      {listId && (
        <ConfirmDialog
          isOpen={showRemoveConfirm}
          onClose={() => setShowRemoveConfirm(false)}
          onConfirm={handleRemoveConfirm}
          title="Remove from this list?"
          message="The item only comes off this list — it stays in your item library."
          confirmText="Remove"
          cancelText="Cancel"
        />
      )}
    </div>
  );
}
