import ListCard from '@/app/ui/components/ListCard';
import ListCollectionsNav from '@/app/ui/components/ListCollectionsNav';
import { auth } from '@/lib/auth';
import { getListsByUser, getUserIdByEmail } from '@/lib/dal';
import { redirect } from 'next/navigation';
import NewListButton from './ui/components/NewListButton';

export default async function MyListsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const viewer = await getUserIdByEmail(session.user.email);
  if (!viewer) redirect('/');

  const lists = await getListsByUser(viewer.id);

  return (
    <div className="my-lists-page">
      <ListCollectionsNav>
        <NewListButton />
      </ListCollectionsNav>

      {lists.length === 0 ? (
        <p className="my-lists-empty">No lists yet. Create your first one.</p>
      ) : (
        <ul className="list-card-grid" role="list">
          {lists.map((list) => (
            <li key={list.id}>
              <ListCard list={list} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
