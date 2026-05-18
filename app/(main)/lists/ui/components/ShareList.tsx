'use client';
import { toggleShareList } from '@/app/actions/lists';
import { ListTable } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { FaLock, FaUnlock } from 'react-icons/fa';

export default function ShareList({ list }: { list: ListTable }) {
  const router = useRouter();
  const [shared, setShared] = useState(list.shared);
  const [isToggling, setIsToggling] = useState(false);

  const toggleShared = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const result = await toggleShareList(list.id, !shared);
      if (result.success) {
        setShared(!shared);
        if (shared) {
          toast.success('List is now private');
        } else {
          toast.success('List is now public');
        }
        router.refresh();
      }
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div
      className={`list-shared${isToggling ? ' toggling' : ''}`}
      onClick={toggleShared}
      aria-disabled={isToggling}
      aria-busy={isToggling}
    >
      {shared ? (
        <>
          <FaUnlock /> Public
        </>
      ) : (
        <>
          <FaLock /> Private
        </>
      )}
    </div>
  );
}
