'use client';

// TODO(#343): split the extra components into their own files, then drop this disable
/* eslint-disable react/no-multi-comp */

import { MenuItem, MenuItemRadio } from '@/app/ui/components/menu';
import {
  SPOILER_TIER_ROWS,
  SpoilerRowIcon,
} from '@/app/ui/components/spoiler-tier-rows';
import { setListVisibility } from '@/lib/data/list.actions';
import { bookmarkList, unbookmarkList } from '@/lib/data/visit.actions';
import { withSpoilerParam } from '@/lib/spoilers';
import { ListTable, type SpoilerTier } from '@/lib/types';
import { type ListVisibility } from '@/lib/visibility';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { FaBookmark, FaRegBookmark } from 'react-icons/fa';
import { MdOutlineIosShare } from 'react-icons/md';
import { VISIBILITY_ROWS, type VisibilityRow } from './visibility-rows';

// ── Share ────────────────────────────────────────────────────────────────
// Mirrors ShareButton's logic but renders as a <MenuItem>. The URL is built
// from list.id rather than window.location, so no presentation-state params
// ever reach the shared URL — the canonical-URL requirement is structurally
// satisfied without a normalization step here.
export function ShareMenuItem({ list }: { list: ListTable }) {
  const listUrl = `https://www.ctrlpluslist.com/lists/${list.id}`;

  const handleClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: list.name, url: listUrl });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          toast.error('Failed to share list');
        }
      }
    } else {
      try {
        await toast.promise(navigator.clipboard.writeText(listUrl), {
          loading: 'Copying',
          success: 'Copied to clipboard',
          error: 'Failed to copy URL to clipboard',
        });
      } catch {
        // already toasted
      }
    }
  };

  return (
    <MenuItem icon={<MdOutlineIosShare size={18} />} onClick={handleClick}>
      Share List
    </MenuItem>
  );
}

// ── Visibility ───────────────────────────────────────────────────────────
// Renders the same three rows VisibilityPicker shows (Hidden / Private /
// Shared) directly inside the kebab menu, instead of opening a nested
// popover. The row table is shared via ./visibility-rows so labels,
// icons, and toast copy stay in lockstep with the popover.
export function VisibilityMenuItems({
  listId,
  initialVisibility,
  disabled,
}: {
  listId: string;
  initialVisibility: ListVisibility;
  disabled: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<ListVisibility>(initialVisibility);
  const [isPending, startTransition] = useTransition();

  // Takes the row, not its value: the row already carries the toast copy, so
  // looking it back up would only reintroduce a miss the caller cannot reach.
  const apply = (row: VisibilityRow) => {
    const next = row.value;
    if (next === current || isPending || disabled) return;
    const prev = current;
    setCurrent(next);
    startTransition(async () => {
      const result = await setListVisibility(listId, next);
      if (!result.success) {
        setCurrent(prev);
        toast.error(result.message);
        return;
      }
      toast.success(row.toast);
      router.refresh();
    });
  };

  return (
    <>
      {VISIBILITY_ROWS.map((row) => (
        <MenuItemRadio
          key={row.value}
          icon={row.icon}
          description={row.description}
          checked={row.value === current}
          aria-disabled={isPending || disabled || undefined}
          onSelect={() => apply(row)}
        >
          {row.label}
        </MenuItemRadio>
      ))}
    </>
  );
}

// ── Spoilers ─────────────────────────────────────────────────────────────
// The hero Spoilers tile's twin inside the collapsed-hero kebab, rendered only
// for a viewer resolving a membership. Same four rows the tile shows, writing
// the same `spoiler` URL param via the shared omit-on-baseline rule, so tile
// and strip stay in lockstep (`list-hero-collapse`).
export function SpoilerMenuItems({
  tier,
  baseline,
}: {
  tier: SpoilerTier;
  baseline: SpoilerTier;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const apply = (next: SpoilerTier) => {
    if (next === tier) return;
    const qs = withSpoilerParam(searchParams?.toString() || '', next, baseline);
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <>
      {SPOILER_TIER_ROWS.map((row) => (
        <MenuItemRadio
          key={row.value}
          icon={<SpoilerRowIcon row={row} />}
          checked={row.value === tier}
          onSelect={() => apply(row.value)}
        >
          {row.title}
        </MenuItemRadio>
      ))}
    </>
  );
}

// ── Bookmark ─────────────────────────────────────────────────────────────
export function BookmarkMenuItem({
  listId,
  initialBookmarked,
}: {
  listId: string;
  initialBookmarked: boolean;
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    if (isPending) return;
    const next = !bookmarked;
    setBookmarked(next);
    startTransition(async () => {
      const result = next
        ? await bookmarkList(listId)
        : await unbookmarkList(listId);
      if (!result.success) {
        setBookmarked(!next);
        toast.error(result.message);
        return;
      }
      toast.success(next ? 'Bookmarked' : 'Bookmark removed');
      router.refresh();
    });
  };

  return (
    <MenuItem
      icon={bookmarked ? <FaBookmark /> : <FaRegBookmark />}
      onClick={toggle}
      aria-disabled={isPending}
    >
      {bookmarked ? 'Bookmarked' : 'Bookmark'}
    </MenuItem>
  );
}
