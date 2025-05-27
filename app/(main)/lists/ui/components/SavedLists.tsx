import { auth } from '@/lib/auth';
import { getSavedListsByUser, getUserIdByEmail } from '@/lib/dal';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function SavedLists() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/');
  }

  const user = await getUserIdByEmail(session.user.email);

  if (!user) {
    redirect('/');
  }

  const savedLists = await getSavedListsByUser(user.id);

  return (
    <>
      {savedLists.length === 0 ? (
        <div className="empty-container">
          <h3>No Saved Lists</h3>
        </div>
      ) : (
        <>
          <div className="list-grid">
            {savedLists.map((savedList) => (
              <div className="list-row" key={savedList.id}>
                <Link className="list" href={`/lists/${savedList.list_id}`}>
                  <div className="list-cell list-name">{savedList.list.name}</div>
                  <div className="list-cell list-occasion">{savedList.list.occasion}</div>
                  <div className="list-cell list-date">
                    {savedList.list.date.toLocaleDateString('en-US', {
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
