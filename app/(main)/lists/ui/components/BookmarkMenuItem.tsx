'use client';

import { MenuItem } from '@/app/ui/components/menu';
import { bookmarkList, unbookmarkList } from '@/lib/data/visit.actions';
import { getMessage } from '@/lib/i18n/utils';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { FaBookmark, FaRegBookmark } from 'react-icons/fa';

export default function BookmarkMenuItem({
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
      if (result.success) {
        toast.success(
          getMessage(next ? 'saved_add_toast' : 'saved_remove_toast')
        );
        router.refresh();
      } else {
        setBookmarked(!next);
        toast.error(result.message);
      }
    });
  };

  return (
    <MenuItem
      icon={bookmarked ? <FaBookmark /> : <FaRegBookmark />}
      onClick={toggle}
      aria-disabled={isPending}
    >
      {getMessage(bookmarked ? 'saved_label' : 'saved_add_label')}
    </MenuItem>
  );
}
