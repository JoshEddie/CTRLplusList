'use client';

import { Button } from '@/app/ui/components/button';
import { ListTable } from '@/lib/types';
import { useState } from 'react';
import { MdModeEdit } from 'react-icons/md';
import ListFormContainer from './ListFormContainer';

export default function EditListAction({ list }: { list: ListTable }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="on-dark" onClick={() => setOpen(true)}>
        <MdModeEdit />
        <span className="label">Edit list</span>
      </Button>
      {open && (
        <ListFormContainer
          user_id={list.user_id}
          list={list}
          isEditing
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
