import EmptyList from '@/app/lists/ui/components/EmptyList';
import { getCurrentUser, getListsByUser } from '@/lib/dal';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function ListSelect() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  const lists = await getListsByUser(user.id);

  return (
    <>
      {lists.length === 0 ? (
        <EmptyList />
      ) : (
        <>
          <div className="list-grid">
            {/* Header Row */}
            <div className="list-header">
              <div className="list-cell">Name</div>
              <div className="list-cell">Occasion</div>
              <div className="list-cell">Date</div>
            </div>

            {/* List Rows */}
            {lists.map((list) => (
              <div className="list-row" key={list.id}>
                <Link className="list" href={`/lists/${list.id}`}>
                  <div className="list-cell list-name">{list.name}</div>
                  <div className="list-cell">{list.occasion}</div>
                  <div className="list-cell">
                    {list.date.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
