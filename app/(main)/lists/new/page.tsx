import { actingAsName } from '@/lib/data/profile.active';
import { authedIdentity } from '@/lib/data/user.session';
import { redirect } from 'next/navigation';
import ListForm from '../ui/components/ListForm';

const NewList = async () => {
  const identity = await authedIdentity();

  if (!identity) {
    redirect('/');
  }

  return (
    <main className="container">
      <ListForm actingAs={await actingAsName(identity)} />
    </main>
  );
};

export default NewList;
