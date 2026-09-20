'use client';

import { Button } from '@/app/ui/components/button';
import { Menu, MenuItem, MenuLinkItem } from '@/app/ui/components/menu';
import { archiveItem } from '@/lib/data/item.actions';
import { getMessage } from '@/lib/i18n/utils';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MdArchive,
  MdModeEdit,
  MdMoreHoriz,
  MdRemoveCircleOutline,
  MdSwapVert,
  MdUnarchive,
  MdVerticalAlignBottom,
  MdVerticalAlignTop,
} from 'react-icons/md';

/** The ends of the list's own order — absent while another sort overrides it. */
export type ListEnds = { first: string; last: string };

/** The entry rows, present only where the item holds one on the surface's list. At quantity 0 there is no entry to act on, so the whole group goes. */
export type EntryActions = {
  ends?: ListEnds;
  move: (targetId: string) => void;
  remove: () => void;
};

export default function OwnerActions({
  itemId,
  showArchiveAction,
  archivedView,
  pathname,
  searchParams,
  onChanged,
  entry,
  onReorderAll,
}: {
  itemId: string;
  showArchiveAction?: boolean;
  archivedView?: boolean;
  pathname: string;
  searchParams: ReadonlyURLSearchParams | null;
  onChanged: () => void;
  entry?: EntryActions;
  /** Opens the list's reorder surface. Absent wherever that surface does not exist — off the list, or on a list too short to arrange. */
  onReorderAll?: () => void;
}) {
  const kebabRef = useRef<HTMLButtonElement>(null);
  const [kebabOpen, setKebabOpen] = useState(false);

  const toggleArchive = async () => {
    const nextArchived = !archivedView;
    const result = await toast.promise(archiveItem(itemId, nextArchived), {
      loading: getMessage(
        nextArchived
          ? 'item_menu_archive_loading'
          : 'item_menu_unarchive_loading'
      ),
      success: getMessage(
        nextArchived
          ? 'item_menu_archive_success'
          : 'item_menu_unarchive_success'
      ),
      error: getMessage('item_menu_archive_error'),
    });
    if (result?.success) onChanged();
  };

  const run = (act: () => void) => () => {
    setKebabOpen(false);
    act();
  };

  const ends = entry?.ends;
  const showTop = !!ends && ends.first !== itemId;
  const showBottom = !!ends && ends.last !== itemId;

  return (
    <div className="item-owner-actions-mobile">
      <Button
        ref={kebabRef}
        variant="ghost"
        size="sm"
        className="item-owner-actions-kebab"
        aria-haspopup="menu"
        aria-expanded={kebabOpen}
        aria-label={getMessage('item_menu_label')}
        onClick={() => setKebabOpen((o) => !o)}
      >
        <MdMoreHoriz />
      </Button>
      <Menu
        open={kebabOpen}
        onClose={() => setKebabOpen(false)}
        anchorRef={kebabRef}
        aria-label={getMessage('item_menu_label')}
      >
        {showTop && (
          <MenuItem
            icon={<MdVerticalAlignTop size={18} />}
            onClick={run(() => entry.move(ends.first))}
          >
            {getMessage('entry_move_top')}
          </MenuItem>
        )}
        {showBottom && (
          <MenuItem
            icon={<MdVerticalAlignBottom size={18} />}
            onClick={run(() => entry.move(ends.last))}
          >
            {getMessage('entry_move_bottom')}
          </MenuItem>
        )}
        {onReorderAll && (
          <MenuItem
            icon={<MdSwapVert size={18} />}
            onClick={run(onReorderAll)}
          >
            {getMessage('entry_reorder_all')}
          </MenuItem>
        )}
        {entry && (
          <MenuItem
            tone="danger"
            icon={<MdRemoveCircleOutline size={18} />}
            onClick={run(entry.remove)}
          >
            {getMessage('entry_remove_label')}
          </MenuItem>
        )}
        {(entry || onReorderAll) && (
          <div className="menu-separator" role="separator" />
        )}
        <MenuLinkItem
          href={`/items/${itemId}?returnTo=${encodeURIComponent(
            pathname +
              (searchParams?.toString() ? `?${searchParams.toString()}` : '')
          )}`}
          icon={<MdModeEdit size={18} />}
          onClick={() => setKebabOpen(false)}
        >
          {getMessage('item_menu_edit')}
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
            {getMessage(
              archivedView ? 'item_menu_unarchive' : 'item_menu_archive'
            )}
          </MenuItem>
        )}
      </Menu>
    </div>
  );
}
