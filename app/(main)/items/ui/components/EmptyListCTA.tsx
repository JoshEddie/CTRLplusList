'use client';

import { useOwnerTabs } from '@/app/(main)/lists/[id]/ownerTabs';
import { Button } from '@/app/ui/components/button';
import { getMessage } from '@/lib/i18n/utils';
import { MdChecklist } from 'react-icons/md';

export default function EmptyListCTA() {
  const tabs = useOwnerTabs();
  return (
    <div className="empty-container">
      <h3>{getMessage('list_empty_title')}</h3>
      <p>{getMessage('list_empty_body')}</p>
      <Button variant="primary" onClick={tabs.showLibrary}>
        <MdChecklist size={18} />
        {getMessage('list_empty_button_label')}
      </Button>
    </div>
  );
}
