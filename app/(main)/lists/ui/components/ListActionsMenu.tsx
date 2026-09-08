'use client';

import { Button } from '@/app/ui/components/button';
import { Menu, MenuItem } from '@/app/ui/components/menu';
import { getMessage } from '@/lib/i18n/utils';
import { ListTable } from '@/lib/types';
import { ReactNode, useRef, useState } from 'react';
import { MdModeEdit, MdMoreVert } from 'react-icons/md';
import ListFormContainer from './ListFormContainer';

export default function ListActionsMenu({
  list,
  isOwner = true,
  prependedItems,
  deleteDisabled,
}: {
  list: ListTable;
  isOwner?: boolean;
  prependedItems?: ReactNode;
  deleteDisabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => setOpen(false);
  const actionsLabel = getMessage('list_actions_label');

  return (
    <>
      <div className="list-actions-menu">
        <Button
          ref={triggerRef}
          variant="on-dark"
          className="menu-trigger"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={actionsLabel}
        >
          <MdMoreVert size={22} />
        </Button>
        <Menu
          open={open}
          onClose={close}
          anchorRef={triggerRef}
          aria-label={actionsLabel}
        >
          {prependedItems}
          {isOwner && (
            <MenuItem
              icon={<MdModeEdit size={18} />}
              onClick={() => {
                close();
                setEditOpen(true);
              }}
            >
              {getMessage('list_edit_label')}
            </MenuItem>
          )}
        </Menu>
      </div>
      {editOpen && (
        <ListFormContainer
          list={list}
          isEditing
          deleteDisabled={deleteDisabled}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  );
}
