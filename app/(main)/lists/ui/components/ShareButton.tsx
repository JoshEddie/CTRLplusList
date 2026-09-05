'use client';

import { Button } from '@/app/ui/components/button';
import { ListTable } from '@/lib/types';
import { toast } from 'react-hot-toast';
import { MdOutlineIosShare } from 'react-icons/md';

export default function ShareButton({ list }: { list: ListTable }) {
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
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <Button variant="on-dark" onClick={handleClick} aria-label="Share list">
      <MdOutlineIosShare />
      <span className="label">Share List</span>
    </Button>
  );
}
