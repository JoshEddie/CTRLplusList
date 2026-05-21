'use client';

import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import ListFormContainer from './ListFormContainer';

export default function NewListButton({
  label = 'New List',
  variant = 'primary',
}: {
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
      {open && <ListFormContainer onClose={() => setOpen(false)} />}
    </>
  );
}
