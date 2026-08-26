'use client';

import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import ListFormContainer from './ListFormContainer';

export default function NewListButton({
  label = 'New List',
  variant = 'primary',
  actingAs,
}: {
  label?: string;
  variant?: 'primary' | 'secondary';
  actingAs?: string;
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
        <ListFormContainer actingAs={actingAs} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
