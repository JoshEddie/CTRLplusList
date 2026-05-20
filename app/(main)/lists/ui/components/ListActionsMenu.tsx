'use client';

import { deleteList } from '@/app/actions/lists';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { ListTable } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
import EditListButton from './EditListButton';

export default function ListActionsMenu({
  list,
  showSpoilers,
  previewMode,
  spoilerHref,
  previewHref,
  exitPreviewHref,
}: {
  list: ListTable;
  showSpoilers: boolean;
  previewMode: boolean;
  spoilerHref: string;
  previewHref: string;
  exitPreviewHref: string;
}) {
  const listId = list.id;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

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

  return (
    <>
      <div ref={menuRef} className="list-actions-menu">
        <button
          type="button"
          className="btn secondary menu-trigger"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="List actions"
        >
          <MdMoreVert size={22} />
        </button>
        {open && (
          <div className="menu-dropdown" role="menu">
            {!previewMode && (
              <Link
                href={`/lists/${listId}/choose-items`}
                className="menu-item"
                role="menuitem"
                onClick={close}
              >
                <MdChecklist size={18} />
                Choose items
              </Link>
            )}
            {!previewMode && (
              <EditListButton
                list={list}
                user_id={list.user_id}
                className="menu-item"
                onOpen={close}
              >
                <MdModeEdit size={18} />
                Edit list
              </EditListButton>
            )}
            <Link
              href={spoilerHref}
              className="menu-item"
              role="menuitem"
              onClick={close}
            >
              {showSpoilers ? (
                <MdVisibilityOff size={18} />
              ) : (
                <MdVisibility size={18} />
              )}
              {showSpoilers ? 'Hide spoilers' : 'Show spoilers'}
            </Link>
            {previewMode ? (
              <Link
                href={exitPreviewHref}
                className="menu-item"
                role="menuitem"
                onClick={close}
              >
                <MdPreview size={18} />
                Exit preview
              </Link>
            ) : (
              <Link
                href={previewHref}
                className="menu-item"
                role="menuitem"
                onClick={close}
              >
                <MdPreview size={18} />
                Preview as viewer
              </Link>
            )}
            {!previewMode && (
              <button
                type="button"
                className="menu-item menu-item-danger"
                role="menuitem"
                onClick={() => {
                  close();
                  setShowConfirm(true);
                }}
              >
                <MdDeleteForever size={18} />
                Delete list
              </button>
            )}
          </div>
        )}
      </div>
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
