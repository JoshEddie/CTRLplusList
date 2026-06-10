import ListCollectionsNav from '@/app/ui/components/ListCollectionsNav';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/data/user';
import { getVisitHistoryByUser } from '@/lib/data/visit';
import { redirect } from 'next/navigation';
import { ClearHistoryButton } from './HistoryActions';
import HistoryList from './HistoryList';

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const viewer = await getUserIdByEmail(session.user.email);
  if (!viewer) redirect('/');

  const rows = await getVisitHistoryByUser(viewer.id, { limit: 100 });

  return (
    <div className="history-page">
      <ListCollectionsNav>
        {rows.length > 0 && <ClearHistoryButton />}
      </ListCollectionsNav>
      <HistoryList rows={rows} />
    </div>
  );
}
