import { auth } from '@/lib/auth';
import { getItemsByUser, getListsByUser, getUserIdByEmail } from '@/lib/dal';
import { ItemDisplay } from '@/lib/types';
import { redirect } from 'next/navigation';
import ItemsPage from './ui/components/ItemsPage';

export default async function Home() {
  const session = await auth();

  const user = session?.user?.email
    ? await getUserIdByEmail(session.user.email)
    : null;

  if (!user) {
    redirect('/');
  }

  const items: ItemDisplay[] = await getItemsByUser(user.id);

  const lists = user?.id ? await getListsByUser(user.id) : [];

  const firstLastName: string[] = user?.name ? user.name.split(' ') : [];
  const firstLastInitial =
    firstLastName.length > 1
      ? `${firstLastName[0]} ${firstLastName[1]?.[0]}`
      : firstLastName[0];

  return (
    <ItemsPage items={items} user_id={user?.id} user_name={firstLastInitial} lists={lists} />
  );
}
