'use client';

import { bookmarkList, unbookmarkList } from '@/lib/data/visit.actions';
import { Button } from '@/app/ui/components/button';
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
      const action = next ? bookmarkList : unbookmarkList;
      const result = await action(listId);
      if (!result.success) {
        setBookmarked(!next);
        toast.error(result.message);
        return;
      }
      toast.success(next ? 'Bookmarked' : 'Bookmark removed');
      router.refresh();
    });
  };

  const label = bookmarked ? 'Remove bookmark' : 'Bookmark list';

  return (
    <Button
      variant="on-dark"
      pressed={bookmarked}
      aria-label={label}
      aria-disabled={isPending}
      onClick={toggle}
    >
      {bookmarked ? <FaBookmark /> : <FaRegBookmark />}
      <span className="label">{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
    </Button>
  );
}
