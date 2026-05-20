'use client';

import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import ListFormContainer from './ListFormContainer';

export default function NewListButton({
  user_id,
  label = 'New List',
  variant = 'primary',
}: {
  user_id: string;
  label?: string;
  variant?: 'primary' | 'secondary';
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`btn ${variant}`}
        onClick={() => setOpen(true)}
      >
        <FaPlus size={14} />
        <span className="mobile-hide">{label}</span>
      </button>
      {open && (
        <ListFormContainer
          user_id={user_id}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
