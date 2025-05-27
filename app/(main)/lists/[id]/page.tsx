import ItemsContainer from '@/app/(main)/items/ui/components/ItemsContainer';
import ListHeader from '@/app/(main)/lists/ui/components/ListHeader';
import { auth } from '@/lib/auth';
import { getList, getUserById, getUserIdByEmail } from '@/lib/dal';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MdModeEdit } from 'react-icons/md';
import DeleteListButton from '../ui/components/DeleteListButton';
import ListPrivate from '../ui/components/ListPrivate';
import SaveContainer from '../ui/components/SaveContainer';
import ShareButton from '../ui/components/ShareButton';
import ShareList from '../ui/components/ShareList';

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const user = session?.user?.email
    ? await getUserIdByEmail(session?.user?.email)
    : null;

  const { id } = await params;

  const list = await getList(id);

  if (!user && !list) {
    redirect('/');
  }

  if (!list) {
    redirect('/lists');
  }

  const listOwner = await getUserById(list?.user_id);

  const isOwner = user?.id === list.user_id;

  if (!list.shared && !isOwner) {
    return <ListPrivate loggedIn={!!user} />;
  }

  return (
    <div className={`list-details-container ${user ? '' : 'no-user'}`}>
      <div className="list-details">
        {isOwner && <ShareList list={list} />}
        <ListHeader title={list.name} user={listOwner} list={list}>
          {isOwner ? (
            <>
              <Link className="btn primary" href={`/lists/${id}/edit`}>
                <MdModeEdit />
                <span className="label mobile-hide">Edit List</span>
              </Link>
              <ShareButton list={list} />
              <DeleteListButton id={list.id} />
            </>
          ) : (
            user?.id && <SaveContainer list_id={list.id} user_id={user.id} />
          )}
        </ListHeader>
      </div>
      <ItemsContainer listId={id} />
    </div>
  );
}
