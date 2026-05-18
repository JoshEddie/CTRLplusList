import { getProfileForUser } from '@/lib/dal';
import { Metadata } from 'next';
import ProfilePage from './ProfilePage';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfileForUser(id, null);
  if (!profile) return { title: 'User not found' };
  return { title: profile.name ?? 'User profile' };
}

export default function Page(props: Props) {
  return <ProfilePage {...props} />;
}
