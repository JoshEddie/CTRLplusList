import { ListTable } from '@/lib/types';
import BookmarkContainer from './BookmarkContainer';
import ShareButton from './ShareButton';

// Row 2's button cluster. Share leads and never moves — every other control
// in the row comes and goes with who is looking, so anchoring the one constant
// keeps a control from landing where a different one stood a moment ago.
export default function HeroActions({
  list,
  viewerUserId,
}: {
  list: ListTable;
  viewerUserId: string | undefined;
}) {
  return (
    <div className="list-hero-actions">
      <ShareButton list={list} />
      {viewerUserId && (
        <BookmarkContainer list_id={list.id} user_id={viewerUserId} />
      )}
    </div>
  );
}
