
import { ListTable } from '@/lib/types';
import Link from 'next/link';
import { MdModeEdit } from 'react-icons/md';
import DeleteListButton from './DeleteListButton';
import ListHeader from './ListHeader';
import SaveContainer from './SaveContainer';
import ShareButton from './ShareButton';
import ShareList from './ShareList';

export default function ListDetails({
  isOwner,
  list,
  user_name,
  user_id,
}: {
  isOwner: boolean;
  list: ListTable;
  user_name: string | undefined;
  user_id: string | undefined;
}) {
  return (
    <div className="list-details">
      {isOwner && <ShareList list={list} />}
      <ListHeader title={list.name} user_name={user_name || null} list={list}>
        {isOwner ? (
          <>
            <Link className="btn primary" href={`/lists/${list.id}/edit`}>
              <MdModeEdit />
              <span className="label mobile-hide">Edit List</span>
            </Link>
            <ShareButton list={list} />
            <DeleteListButton id={list.id} />
          </>
        ) : (
          user_id && <SaveContainer list_id={list.id} user_id={user_id} />
        )}
      </ListHeader>
    </div>
  );
}
