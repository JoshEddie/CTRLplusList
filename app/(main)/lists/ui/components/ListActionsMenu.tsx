'use client';

import { deleteList } from '@/lib/data/list.actions';
import { Button } from '@/app/ui/components/button';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { Menu, MenuItem, MenuLinkItem } from '@/app/ui/components/menu';
import { ListTable } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { ReactNode, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MdChecklist,
  MdDeleteForever,
  MdModeEdit,
  MdMoreVert,
  MdPreview,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md';
import ListFormContainer from './ListFormContainer';

export default function ListActionsMenu({
  list,
  showSpoilers,
  previewMode,
  spoilerHref,
  previewHref,
  exitPreviewHref,
  isOwner = true,
  prependedItems,
}: {
  list: ListTable;
  showSpoilers: boolean;
  previewMode: boolean;
  spoilerHref: string;
  previewHref: string;
  exitPreviewHref: string;
  isOwner?: boolean;
  prependedItems?: ReactNode;
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
  const showSpoilerToggle = isOwner;
  const showPreviewToggle = isOwner;
  const showOwnerEdit = isOwner && !previewMode;
  const showOwnerChoose = isOwner && !previewMode;
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
          {showOwnerChoose && (
            <MenuLinkItem
              href={`/lists/${listId}/choose-items`}
              icon={<MdChecklist size={18} />}
              onClick={close}
            >
              Choose items
            </MenuLinkItem>
          )}
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
          {showSpoilerToggle && (
            <MenuLinkItem
              href={spoilerHref}
              icon={
                showSpoilers ? (
                  <MdVisibilityOff size={18} />
                ) : (
                  <MdVisibility size={18} />
                )
              }
              onClick={close}
            >
              {showSpoilers ? 'Hide spoilers' : 'Show spoilers'}
            </MenuLinkItem>
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
              onClick={() => {
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
