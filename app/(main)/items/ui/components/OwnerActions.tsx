'use client';

import { Button } from '@/app/ui/components/button';
import { Menu, MenuItem, MenuLinkItem } from '@/app/ui/components/menu';
import { archiveItem } from '@/lib/data/item.actions';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MdArchive,
  MdModeEdit,
  MdMoreHoriz,
  MdUnarchive,
} from 'react-icons/md';

export default function OwnerActions({
  itemId,
  showArchiveAction,
  archivedView,
  pathname,
  searchParams,
  onChanged,
}: {
  itemId: string;
  showArchiveAction?: boolean;
  archivedView?: boolean;
  pathname: string;
  searchParams: ReadonlyURLSearchParams | null;
  onChanged: () => void;
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
      </Menu>
    </div>
  );
}
