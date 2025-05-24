import ItemsContainer from '@/app/items/ui/components/ItemsContainer';
import Header from '@/app/ui/components/Header';
import { getList } from '@/lib/dal';
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
  const { id } = await params;

  const list = await getList(id);

  if (!list) {
    redirect('/lists');
  }

  return (
    <div className="list-container">
      <Header title={list.name}>
        <DeleteListButton id={list.id} />
        <Link className="btn primary" href={`/lists/${id}/edit`}>
          <MdModeEdit />
          <span className="label mobile-hide">Edit List</span>
        </Link>
        <ShareButton list={list} />
      </Header>
      <ItemsContainer listId={id} showEditButton={true} />
    </div>
  );
}
