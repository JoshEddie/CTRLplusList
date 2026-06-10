'use client';

import { archiveItem } from '@/lib/data/item.actions';
import { Button } from '@/app/ui/components/button';
import { Menu, MenuItem, MenuLinkItem } from '@/app/ui/components/menu';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MdArchive,
  MdModeEdit,
  MdMoreHoriz,
  MdUnarchive,
} from 'react-icons/md';
import EditItemButton from './EditItemButton';

export default function OwnerActions({
  itemId,
  user_id,
  showArchiveAction,
  archivedView,
  pathname,
  searchParams,
  onArchived,
}: {
  itemId: string;
  user_id?: string;
  showArchiveAction?: boolean;
  archivedView?: boolean;
  pathname: string;
  searchParams: ReadonlyURLSearchParams | null;
  onArchived: () => void;
}) {
  const kebabRef = useRef<HTMLButtonElement>(null);
  const [kebabOpen, setKebabOpen] = useState(false);

  const toggleArchive = async () => {
    const nextArchived = !archivedView;
    const result = await toast.promise(archiveItem(itemId, nextArchived), {
      loading: nextArchived ? 'Archiving' : 'Unarchiving',
      success: nextArchived ? 'Archived' : 'Unarchived',
      error: 'Failed',
    });
    if (result?.success) onArchived();
  };

  const archiveLabel = archivedView ? 'Unarchive item' : 'Archive item';

  return (
    <>
      <div className="item-owner-actions">
        {showArchiveAction && (
          <button
            type="button"
            className="archive-button"
            onClick={toggleArchive}
            aria-label={archiveLabel}
            title={archiveLabel}
          >
            {archivedView ? <MdUnarchive /> : <MdArchive />}
          </button>
        )}
        {user_id && <EditItemButton itemId={itemId} user_id={user_id} />}
      </div>
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
                archivedView ? (
                  <MdUnarchive size={18} />
                ) : (
                  <MdArchive size={18} />
                )
              }
              onClick={async () => {
                setKebabOpen(false);
                await toggleArchive();
              }}
            >
              {archivedView ? 'Unarchive' : 'Archive'}
            </MenuItem>
          )}
        </Menu>
      </div>
    </>
  );
}
