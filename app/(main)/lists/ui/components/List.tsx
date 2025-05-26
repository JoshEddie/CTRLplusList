import Empty from '@/app/ui/components/Empty';
import { auth } from '@/lib/auth';
import { getListsByUser, getUserIdByEmail } from '@/lib/dal';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function ListSelect() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/');
  }

  const user = await getUserIdByEmail(session.user.email);

  if (!user) {
    redirect('/');
  }

  const lists = await getListsByUser(user.id);

  return (
    <>
      {lists.length === 0 ? (
        <Empty type="list" />
      ) : (
        <>
          <div className="list-grid">
            {/* Header Row */}
            <div className="list-header mobile-hide">
              <div className="list-cell">Name</div>
              <div className="list-cell">Occasion</div>
              <div className="list-cell">Date</div>
            </div>

            {/* List Rows */}
            {lists.map((list) => (
              <div className="list-row" key={list.id}>
                <Link className="list" href={`/lists/${list.id}`}>
                  <div className="list-cell list-name">{list.name}</div>
                  <div className="list-cell list-occasion">{list.occasion}</div>
                  <div className="list-cell list-date">
                    {list.date.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
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
