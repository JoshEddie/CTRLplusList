import ItemsContainer from '@/app/(main)/items/ui/components/ItemsContainer';
import ListHeader from '@/app/(main)/lists/ui/components/ListHeader';
import { auth } from '@/lib/auth';
import { getList, getUserById, getUserIdByEmail } from '@/lib/dal';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MdModeEdit } from 'react-icons/md';
import DeleteListButton from '../ui/components/DeleteListButton';
import ShareButton from '../ui/components/ShareButton';

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const session = await auth();
  const user = session?.user?.email ? await getUserIdByEmail(session?.user?.email) : null;

  const { id } = await params;

  const list = await getList(id);

  if (!list) {
    redirect('/lists');
  }

  const listOwner = await getUserById(list?.user_id);

  const isOwner = user?.id === list.user_id;

  return (
    <div className="list-container">
      <ListHeader title={list.name} user={listOwner} list={list}>
        {isOwner && (
          <>
            <DeleteListButton id={list.id} />
            <Link className="btn primary" href={`/lists/${id}/edit`}>
              <MdModeEdit />
              <span className="label mobile-hide">Edit List</span>
            </Link>
            <ShareButton list={list} />
          </>
        )}
      </ListHeader>
      <ItemsContainer listId={id} />
    </div>
  );
}
