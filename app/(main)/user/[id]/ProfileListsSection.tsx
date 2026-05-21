import { getPublicListsByUser } from '@/lib/dal';
import PublicListsGrid from '../../users/ui/components/PublicListsGrid';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProfileListsSection({ params }: Props) {
  const { id } = await params;
  const lists = await getPublicListsByUser(id, { limit: 50 });
  return <PublicListsGrid lists={lists} />;
}
