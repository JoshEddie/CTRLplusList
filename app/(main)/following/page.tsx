import { Metadata } from 'next';
import FollowingPage from './FollowingPage';

export const metadata: Metadata = { title: 'Following' };

export default function Page() {
  return <FollowingPage />;
}
