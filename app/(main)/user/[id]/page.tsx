import { Metadata } from 'next';
import ProfilePage from './ProfilePage';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const metadata: Metadata = { title: 'User profile' };

export default function Page(props: Props) {
  return <ProfilePage {...props} />;
}
