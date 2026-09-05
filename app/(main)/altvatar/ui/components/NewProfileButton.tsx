'use client';

import { Button } from '@/app/ui/components/button';
import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import NewProfileForm from './NewProfileForm';

// Client state, not a route: the form has exactly one call site, so there is
// no navigation to intercept and `app/(main)/@modal` stays dormant.
export default function NewProfileButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <FaPlus size={14} />
        <span className="mobile-hide">New Altvatar</span>
      </Button>
      {open && <NewProfileForm onClose={() => setOpen(false)} />}
    </>
  );
}
