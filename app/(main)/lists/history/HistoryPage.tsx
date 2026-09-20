import ListCollectionsNav from '@/app/ui/components/ListCollectionsNav';
import { authedUserId } from '@/lib/data/user.session';
import { getVisitHistoryByUser } from '@/lib/data/visit';
import { redirect } from 'next/navigation';
import { ClearHistoryButton } from './HistoryActions';
import HistoryList from './HistoryList';

export default async function HistoryPage() {
  const viewerId = await authedUserId();
  if (!viewerId) redirect('/');

  const rows = await getVisitHistoryByUser(viewerId, { limit: 100 });

  return (
    <div className="history-page">
      <ListCollectionsNav>
        {rows.length > 0 && <ClearHistoryButton />}
      </ListCollectionsNav>
      <HistoryList rows={rows} />
    </div>
  );
}
