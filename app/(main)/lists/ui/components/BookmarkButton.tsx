'use client';

import { bookmarkList, unbookmarkList } from '@/app/actions/lists';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { FaBookmark, FaRegBookmark } from 'react-icons/fa';

export default function BookmarkButton({
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
    <button
      type="button"
      className="btn secondary bookmark-button"
      aria-pressed={bookmarked}
      aria-disabled={isPending}
      onClick={toggle}
    >
      {bookmarked ? <FaBookmark /> : <FaRegBookmark />}
      <span className="label">{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
    </button>
  );
}
