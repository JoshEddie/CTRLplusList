import { getItemsByProfile } from '@/lib/data/item';
import { actingAsName } from '@/lib/data/profile.active';
import { getListsByProfile } from '@/lib/data/list';
import { getSpoilerBaseline } from '@/lib/data/profile.members';
import { resolveSpoilerTier } from '@/lib/spoilers';
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

  // The library's items are owned by the profile the request acts as, so that
  // is the profile whose membership resolves protection here.
  const baseline = await getSpoilerBaseline(
    identity.userId,
    identity.activeProfile.id
  );
  const tier = resolveSpoilerTier(baseline, sp);

  const initialPageSize = await readItemsPageSize();

  const [activeItems, archivedItems] = await Promise.all([
    getItemsByProfile(identity.activeProfile.id, {
      filter: 'active',
      tier,
    }),
    getItemsByProfile(identity.activeProfile.id, {
      filter: 'archived',
      tier,
    }),
  ]);

  const lists = await getListsByProfile(identity.activeProfile.id);

  const actingAs = await actingAsName(identity);

  const firstLastInitial = viewerDisplayName(identity.selfProfile.name);

  const actor = identity.activeProfile;

  return (
    <main className="container container--items-library">
      <ItemsPage
        items={activeItems as ItemDisplay[]}
        archivedItems={archivedItems as ItemDisplay[]}
        actor={actor}
        user_name={firstLastInitial}
        lists={lists}
        initialPageSize={initialPageSize}
        actingAs={actingAs}
        tier={tier}
        baseline={baseline}
      />
    </main>
  );
}
