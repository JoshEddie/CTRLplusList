'use client';

import { setListVisibility } from '@/lib/data/list.actions';
import { bookmarkList, unbookmarkList } from '@/lib/data/visit.actions';
import { followUser, unfollowUser } from '@/lib/data/user.actions';
import { MenuItem, MenuItemRadio } from '@/app/ui/components/menu';
import { ListTable } from '@/lib/types';
import { VISIBILITY, fromDb, type ListVisibility } from '@/lib/visibility';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FaBookmark, FaCheck, FaPlus, FaRegBookmark } from 'react-icons/fa';
import { MdOutlineIosShare } from 'react-icons/md';
import toast from 'react-hot-toast';
import FollowDisclosureDialog from '@/app/(main)/users/ui/components/FollowDisclosureDialog';
import { VISIBILITY_ROWS } from './visibility-rows';

// ── Share ────────────────────────────────────────────────────────────────
// Mirrors ShareButton's logic but renders as a <MenuItem>. The URL is built
// from list.id rather than window.location, so the `?hero=closed` param is
// never present in the shared URL — the requirement is structurally
// satisfied without a normalization step here.
export function ShareMenuItem({ list }: { list: ListTable }) {
  const router = useRouter();
  const listUrl = `https://www.ctrlpluslist.com/lists/${list.id}`;
  const rawVisibility = (list as { visibility?: string }).visibility;
  const visibility = rawVisibility
    ? fromDb(rawVisibility)
    : list.shared
      ? VISIBILITY.LINK
      : VISIBILITY.OWNER;
  const isPrivate = visibility === VISIBILITY.OWNER;

  const performShare = async () => {
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

  const handleClick = async () => {
    if (isPrivate) {
      // Promote to link-only then share, matching ShareButton's flow.
      void setListVisibility(list.id, VISIBILITY.LINK).then((result) => {
        if (result.success) {
          toast.success('Sharing enabled');
          router.refresh();
        } else {
          toast.error('Failed to enable sharing');
        }
      });
    }
    await performShare();
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
}: {
  listId: string;
  initialVisibility: ListVisibility;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<ListVisibility>(initialVisibility);
  const [isPending, startTransition] = useTransition();

  const apply = (next: ListVisibility) => {
    if (next === current || isPending) return;
    const prev = current;
    setCurrent(next);
    startTransition(async () => {
      const result = await setListVisibility(listId, next);
      if (!result.success) {
        setCurrent(prev);
        toast.error(result.message);
        return;
      }
      const row = VISIBILITY_ROWS.find((r) => r.value === next);
      if (row) toast.success(row.toast);
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
          disabled={isPending}
          onSelect={() => apply(row.value)}
        >
          {row.label}
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

// ── Follow ───────────────────────────────────────────────────────────────
export function FollowMenuItem({
  ownerId,
  ownerName,
  initialFollowing,
  requireDisclosure,
}: {
  ownerId: string;
  ownerName: string | null;
  initialFollowing: boolean;
  requireDisclosure: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const performFollow = () => {
    setFollowing(true);
    startTransition(async () => {
      const result = await followUser(ownerId);
      if (!result.success) {
        setFollowing(false);
        toast.error(result.message);
        return;
      }
      toast.success(`Following ${ownerName ?? 'user'}`);
      router.refresh();
    });
  };

  const performUnfollow = () => {
    setFollowing(false);
    startTransition(async () => {
      const result = await unfollowUser(ownerId);
      if (!result.success) {
        setFollowing(true);
        toast.error(result.message);
        return;
      }
      toast.success('Unfollowed');
      router.refresh();
    });
  };

  const handleClick = () => {
    if (isPending) return;
    if (following) {
      performUnfollow();
      return;
    }
    if (requireDisclosure) {
      setDialogOpen(true);
      return;
    }
    performFollow();
  };

  const label = following
    ? 'Following'
    : ownerName
      ? `Follow ${ownerName}`
      : 'Follow';

  return (
    <>
      <MenuItem
        icon={following ? <FaCheck /> : <FaPlus />}
        onClick={handleClick}
        aria-disabled={isPending}
      >
        {label}
      </MenuItem>
      <FollowDisclosureDialog
        open={dialogOpen}
        ownerName={ownerName ?? 'this user'}
        onConfirm={() => {
          setDialogOpen(false);
          performFollow();
        }}
        onCancel={() => setDialogOpen(false)}
      />
    </>
  );
}
