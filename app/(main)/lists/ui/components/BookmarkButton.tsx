'use client';

import { Button } from '@/app/ui/components/button';
import { bookmarkList, unbookmarkList } from '@/lib/data/visit.actions';
import { getMessage } from '@/lib/i18n/utils';
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
      toast.success(getMessage(next ? 'saved_add_toast' : 'saved_remove_toast'));
      router.refresh();
    });
  };

  const label = getMessage(bookmarked ? 'saved_remove_aria_label' : 'saved_add_aria_label');

  return (
    <Button
      size='xs'
      variant="on-dark"
      pressed={bookmarked}
      aria-label={label}
      aria-disabled={isPending}
      onClick={toggle}
    >
      {bookmarked ? <FaBookmark /> : <FaRegBookmark />}
      <span className="label">{getMessage(bookmarked ? 'saved_label' : 'saved_add_label')}</span>
    </Button>
  );
}
