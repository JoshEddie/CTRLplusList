'use client';

import { Button } from '@/app/ui/components/button';
import { getMessage } from '@/lib/i18n/utils';
import { FaPlus } from 'react-icons/fa';
import { useOwnerTabs } from './ownerTabs';

export default function LibraryEmpty() {
  const tabs = useOwnerTabs();
  return (
    <div className="empty-container">
      <h3>{getMessage('library_empty_title')}</h3>
      <p>{getMessage('library_empty_body')}</p>
      <Button variant="primary" onClick={tabs.createItem}>
        <FaPlus size={12} />
        {getMessage('add_item_create_new')}
      </Button>
    </div>
  );
}
