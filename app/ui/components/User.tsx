import { getCurrentUser } from '@/lib/dal';
import SignOutButton from './SignOutButton';

export default async function User() {
  const user = await getCurrentUser();

  return (
    <>
      {user && (
        <div className="user-container">
          <div className="user-name">User: {user.name}</div>
          <SignOutButton />
        </div>
      )}
    </>
  );
}
