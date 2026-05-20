'use client';

import { ListTable } from '@/lib/types';
import { useState } from 'react';
import ListFormContainer from './ListFormContainer';

export default function EditListButton({
  list,
  user_id,
  className,
  children,
  onOpen,
}: {
  list: ListTable;
  user_id: string;
  className?: string;
  children: React.ReactNode;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open && (
        <ListFormContainer
          user_id={user_id}
          list={list}
          isEditing
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
