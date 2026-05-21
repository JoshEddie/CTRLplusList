import { Metadata } from 'next';
import FollowingPage from './FollowingPage';

export const metadata: Metadata = { title: 'Following' };

export default function Page() {
  return (
    <main className="container container--list-collections">
      <FollowingPage />
    </main>
  );
}
