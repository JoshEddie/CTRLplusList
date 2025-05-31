'use client';

import { ListTable } from '@/lib/types';
import { toast } from 'react-hot-toast';
import { MdOutlineIosShare } from 'react-icons/md';

export default function ShareButton({ list }: { list: ListTable }) {
  const listUrl = `https://www.ctrlpluslist.com/lists/${list.id}`;

  const copyToClipboard = async () => {
    try {
      toast.promise(
        async () => {
          await navigator.clipboard.writeText(listUrl);
          return true;
        },
        {
          loading: 'Copying',
          success: 'Copied to clipboard',
          error: 'Failed to copy URL to clipboard',
        }
      );
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareList = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: list.name,
          url: listUrl,
        });
      } catch (error) {
        console.error('Error sharing list:', error);
        toast.error('Failed to share list');
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      await copyToClipboard();
    }
  };

  return (
    <button 
      className={`btn primary`} 
      onClick={shareList}
      aria-label="Share list"
    >
      <MdOutlineIosShare />
      <span className="label mobile-hide">Share List</span>
    </button>
  );
}
