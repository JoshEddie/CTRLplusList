import ItemsContainer from '@/app/items/ui/components/ItemsContainer';
import Header from '@/app/ui/components/Header';
import { getList } from '@/lib/dal';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MdModeEdit, MdOutlineIosShare } from 'react-icons/md';
import DeleteButton from '../ui/components/DeleteButton';

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const list = await getList(parseInt(id));

  if (!list) {
    redirect('/lists');
  }

  return (
    <div className="list-container">
      <Header title={list.name}>
        <DeleteButton id={list.id} />
        <Link className="btn primary" href={`/lists/${id}/edit`}>
          <MdModeEdit />
          Edit List
        </Link>
        <Link className="btn primary" href={`/lists/${id}/shared`}>
          <MdOutlineIosShare />
          Share List
        </Link>
      </Header>
      <ItemsContainer listId={parseInt(id)} showEditButton={true} />
    </div>
  );
}
