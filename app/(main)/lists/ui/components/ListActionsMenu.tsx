'use client';

import { Button } from '@/app/ui/components/button';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { Menu, MenuItem, MenuLinkItem } from '@/app/ui/components/menu';
import { deleteList } from '@/lib/data/list.actions';
import { ListTable } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { ReactNode, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MdDeleteForever,
  MdModeEdit,
  MdMoreVert,
  MdPreview
} from 'react-icons/md';
import ListFormContainer from './ListFormContainer';

export default function ListActionsMenu({
  list,
  previewMode,
  previewHref,
  exitPreviewHref,
  isOwner = true,
  prependedItems,
  disabled,
}: {
  list: ListTable;
  previewMode: boolean;
  previewHref: string;
  exitPreviewHref: string;
  isOwner?: boolean;
  prependedItems?: ReactNode;
  disabled: boolean;
}) {
  const listId = list.id;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleDelete = async () => {
    const result = await deleteList(listId);
    if (result.success) {
      toast.success('List deleted successfully');
      router.push('/lists');
    } else {
      toast.error(result.error || 'Failed to delete list');
    }
  };

  const close = () => setOpen(false);
  const showPreviewToggle = isOwner;
  const showOwnerEdit = isOwner && !previewMode;
  const showOwnerDelete = isOwner && !previewMode;

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
          aria-label="List actions"
        >
          <MdMoreVert size={22} />
        </Button>
        <Menu
          open={open}
          onClose={close}
          anchorRef={triggerRef}
          aria-label="List actions"
        >
          {prependedItems}
          {showOwnerEdit && (
            <MenuItem
              icon={<MdModeEdit size={18} />}
              onClick={() => {
                close();
                setEditOpen(true);
              }}
            >
              Edit list
            </MenuItem>
          )}
          {showPreviewToggle &&
            (previewMode ? (
              <MenuLinkItem
                href={exitPreviewHref}
                icon={<MdPreview size={18} />}
                onClick={close}
              >
                Exit preview
              </MenuLinkItem>
            ) : (
              <MenuLinkItem
                href={previewHref}
                icon={<MdPreview size={18} />}
                onClick={close}
              >
                Preview as viewer
              </MenuLinkItem>
            ))}
          {showOwnerDelete && (
            <MenuItem
              icon={<MdDeleteForever size={18} />}
              tone="danger"
              aria-disabled={disabled || undefined}
              onClick={() => {
                if (disabled) return;
                close();
                setShowConfirm(true);
              }}
            >
              Delete list
            </MenuItem>
          )}
        </Menu>
      </div>
      {editOpen && (
        <ListFormContainer
          list={list}
          isEditing
          deleteDisabled={disabled}
          onClose={() => setEditOpen(false)}
        />
      )}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this list? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}
