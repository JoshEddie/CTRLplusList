'use client';

import { archiveItem } from '@/lib/data/item.actions';
import { removeListItem } from '@/lib/data/listItems.actions';
import { Button } from '@/app/ui/components/button';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { Menu, MenuItem, MenuLinkItem } from '@/app/ui/components/menu';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MdArchive,
  MdModeEdit,
  MdMoreHoriz,
  MdRemoveCircleOutline,
  MdUnarchive,
} from 'react-icons/md';

export default function OwnerActions({
  itemId,
  showArchiveAction,
  archivedView,
  listId,
  pathname,
  searchParams,
  onArchived,
}: {
  itemId: string;
  showArchiveAction?: boolean;
  archivedView?: boolean;
  listId?: string;
  pathname: string;
  searchParams: ReadonlyURLSearchParams | null;
  onArchived: () => void;
}) {
  const kebabRef = useRef<HTMLButtonElement>(null);
  const [kebabOpen, setKebabOpen] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const toggleArchive = async () => {
    const nextArchived = !archivedView;
    const result = await toast.promise(archiveItem(itemId, nextArchived), {
      loading: nextArchived ? 'Archiving' : 'Unarchiving',
      success: nextArchived ? 'Archived' : 'Unarchived',
      error: 'Failed',
    });
    if (result?.success) onArchived();
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
    if (result?.success) onArchived();
  };

  return (
    <div className="item-owner-actions-mobile">
      <Button
        ref={kebabRef}
        variant="ghost"
        size="sm"
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
