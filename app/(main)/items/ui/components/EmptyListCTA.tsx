'use client';

import { enterEditHref } from '@/app/(main)/lists/[id]/editModeChanges';
import { LinkButton } from '@/app/ui/components/button';
import { getMessage } from '@/lib/i18n/utils';
import { useSearchParams } from 'next/navigation';
import { MdChecklist } from 'react-icons/md';

export default function EmptyListCTA({ listId }: { listId: string }) {
  const searchParams = useSearchParams();
  return (
    <div className="empty-container">
      <h3>{getMessage('list_empty_title')}</h3>
      <p>{getMessage('list_empty_body')}</p>
      <LinkButton href={enterEditHref(listId, searchParams)} variant="primary">
        <MdChecklist size={18} />
        {getMessage('list_empty_button_label')}
      </LinkButton>
    </div>
  );
}
