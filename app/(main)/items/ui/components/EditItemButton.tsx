'use client';

import { getItemEditData } from '@/lib/data/item.actions';
import { ItemStoreTable, ItemTable, ListTable } from '@/lib/types';
import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { MdModeEdit } from 'react-icons/md';
import ItemFormContainer from './itemform/ItemFormContainer';

type EditItemData = {
  item: ItemTable & {
    stores: ItemStoreTable[];
    lists: ListTable[];
    archived_at?: Date | null;
  };
  lists: ListTable[];
};

// useSyncExternalStore needs a subscribe fn even when the value never changes;
// returning a noop unsubscribe means the gate is "true on client, false on SSR".
const subscribeNoop = () => () => {};

export default function EditItemButton({
  itemId,
  user_id,
}: {
  itemId: string;
  user_id: string;
}) {
  const [data, setData] = useState<EditItemData | null>(null);
  const [loading, setLoading] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const handleOpen = async () => {
    if (loading || data) return;
    setLoading(true);
    try {
      const result = await getItemEditData(itemId);
      if (!result) {
        toast.error('Could not load item');
        return;
      }
      setData(result as EditItemData);
    } catch (error) {
      console.error('Failed to load item:', error);
      toast.error('Could not load item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="edit-button"
        aria-label="Edit item"
        onClick={handleOpen}
        disabled={loading}
      >
        <MdModeEdit />
      </button>
      {mounted &&
        data &&
        createPortal(
          <ItemFormContainer
            user_id={user_id}
            lists={data.lists}
            item={data.item}
            onClose={() => setData(null)}
          />,
          document.body
        )}
    </>
  );
}
