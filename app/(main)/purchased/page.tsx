import Header from '@/app/ui/components/Header';
import { getItemsByPurchased } from '@/lib/data/purchase';
import { authedIdentity } from '@/lib/data/user.session';
import { redirect } from 'next/navigation';
import Items from '../items/ui/components/Items';

export default async function Purchased() {
  const identity = await authedIdentity();
  if (!identity) {
    redirect('/');
  }

  const items = await getItemsByPurchased(identity.profile.id);
  return (
    <main className="container container--items-library">
      <Header title="Purchased" />
      <Items items={items} />
    </main>
  );
}
