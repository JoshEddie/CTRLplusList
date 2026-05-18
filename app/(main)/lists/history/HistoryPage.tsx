import Header from '@/app/ui/components/Header';
import { auth } from '@/lib/auth';
import { getUserIdByEmail, getVisitHistoryByUser } from '@/lib/dal';
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
      <Header title="Recently visited">
        {rows.length > 0 && <ClearHistoryButton />}
      </Header>
      <HistoryList rows={rows} />
    </div>
  );
}
