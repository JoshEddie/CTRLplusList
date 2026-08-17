import { getItemsByProfile } from '@/lib/data/item';
import { getListsByProfile } from '@/lib/data/list';
import { authedIdentity } from '@/lib/data/user.session';
import { ItemDisplay } from '@/lib/types';
import { redirect } from 'next/navigation';
import ItemsPage from './ui/components/ItemsPage';
import { readItemsPageSize, viewerDisplayName } from './utils';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const identity = await authedIdentity();
  if (!identity) {
    redirect('/');
  }

  const sp = await searchParams;
  const purchasesParam =
    typeof sp.purchases === 'string' ? sp.purchases : undefined;
  const showSpoilers = purchasesParam === 'reveal' || purchasesParam === 'only';

  const initialPageSize = await readItemsPageSize();

  const [activeItems, archivedItems] = await Promise.all([
    getItemsByProfile(identity.profile.id, { filter: 'active', showSpoilers }),
    getItemsByProfile(identity.profile.id, { filter: 'archived', showSpoilers }),
  ]);

  const lists = await getListsByProfile(identity.profile.id);

  const firstLastInitial = viewerDisplayName(identity.profile.name);

  return (
    <main className="container container--items-library">
      <ItemsPage
        items={activeItems as ItemDisplay[]}
        archivedItems={archivedItems as ItemDisplay[]}
        profile_id={identity.profile.id}
        user_name={firstLastInitial}
        lists={lists}
        initialPageSize={initialPageSize}
      />
    </main>
  );
}
