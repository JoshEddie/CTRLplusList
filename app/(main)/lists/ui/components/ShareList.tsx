'use client';
import { toggleShareList } from '@/app/actions/lists';
import { ListTable } from '@/lib/types';
import { useState } from 'react';
import { FaLock, FaUnlock } from 'react-icons/fa';

export default function ShareList({ list }: { list: ListTable }) {
  const [shared, setShared] = useState(list.shared);

  const toggleShared = async () => {
    const result = await toggleShareList(list.id, !shared);
    if (result.success) {
      setShared(!shared);
    }
  };

  return (
    <div className={`list-shared`} onClick={toggleShared}>
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
