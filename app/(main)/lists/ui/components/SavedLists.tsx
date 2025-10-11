import { auth } from '@/lib/auth';
import { getSavedListsByUser, getUserIdByEmail } from '@/lib/dal';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FaCalendar, FaGift, FaUser } from 'react-icons/fa';

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
                  <div className="list-cell-details">
                    <div className="list-cell list-owner"><FaUser /> {savedList.list.user.name}</div>
                    <div className="list-cell list-occasion"><FaGift /> {savedList.list.occasion}</div>
                    <div className="list-cell list-date">
                      <FaCalendar />
                      {savedList.list.date.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                      timeZone: 'UTC',
                    })}
                  </div>
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
