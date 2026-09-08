'use client';

import { Button } from '@/app/ui/components/button';
import { getMessage } from '@/lib/i18n/utils';
import { ListTable } from '@/lib/types';
import { useState } from 'react';
import { MdModeEdit } from 'react-icons/md';
import ListFormContainer from './ListFormContainer';

export default function EditListAction({
  list,
  deleteDisabled,
}: {
  list: ListTable;
  deleteDisabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = getMessage('list_edit_label');
  return (
    <>
      <Button
        variant="on-dark"
        size="sm"
        icon
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        <MdModeEdit />
      </Button>
      {open && (
        <ListFormContainer
          list={list}
          isEditing
          deleteDisabled={deleteDisabled}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
