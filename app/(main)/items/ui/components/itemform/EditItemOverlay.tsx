'use client';

import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { getItemForEdit } from '@/lib/data/item.actions';
import { getMessage } from '@/lib/i18n/utils';
import { useEffect, useState } from 'react';
import { DeckScreen, DeckShell } from './deck/DeckShell';
import ItemFormContainer from './ItemFormContainer';

type Loaded = Awaited<ReturnType<typeof getItemForEdit>>;

export default function EditItemOverlay({
  itemId,
  onClose,
}: {
  itemId: string;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | undefined>();

  useEffect(() => {
    getItemForEdit(itemId)
      .catch((error) => {
        console.error('Error loading item for edit:', error);
        return null;
      })
      .then(setLoaded);
  }, [itemId]);

  if (loaded) {
    return (
      <ItemFormContainer
        item={loaded.item}
        lists={loaded.lists}
        deleteDisabled={loaded.deleteDisabled}
        onClose={onClose}
        onSuccess={onClose}
      />
    );
  }

  return (
    <DeckShell
      moduleTitle={getMessage('item_edit_title')}
      onClose={onClose}
      onEscape={onClose}
    >
      {loaded === null ? (
        <DeckScreen title={getMessage('item_edit_load_error')} />
      ) : (
        <LoadingIndicator size="form" />
      )}
    </DeckShell>
  );
}
