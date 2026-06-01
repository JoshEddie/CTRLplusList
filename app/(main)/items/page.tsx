import { auth } from '@/lib/auth';
import { getItemsByUser, getListsByUser, getUserIdByEmail } from '@/lib/dal';
import { ItemDisplay } from '@/lib/types';
import { redirect } from 'next/navigation';
import ItemsPage from './ui/components/ItemsPage';
import { readItemsPageSize, viewerDisplayName } from './utils';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();

  const user = session?.user?.email
    ? await getUserIdByEmail(session.user.email)
    : null;

  if (!user) {
    redirect('/');
  }

  const sp = await searchParams;
  const purchasesParam =
    typeof sp.purchases === 'string' ? sp.purchases : undefined;
  const showSpoilers = purchasesParam === 'reveal' || purchasesParam === 'only';

  const initialPageSize = await readItemsPageSize();

  const [activeItems, archivedItems] = await Promise.all([
    getItemsByUser(user.id, { filter: 'active', showSpoilers }),
    getItemsByUser(user.id, { filter: 'archived', showSpoilers }),
  ]);

  const lists = await getListsByUser(user.id);

  const firstLastInitial = viewerDisplayName(user.name);

  return (
    <main className="container container--items-library">
      <ItemsPage
        items={activeItems as ItemDisplay[]}
        archivedItems={archivedItems as ItemDisplay[]}
        user_id={user?.id}
        user_name={firstLastInitial}
        lists={lists}
        initialPageSize={initialPageSize}
      />
    </main>
  );
}
