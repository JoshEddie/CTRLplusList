import SortItemsContainer from '@/app/(main)/items/ui/components/SortItemsContainer';
import { auth } from '@/lib/auth';
import { getList, getUserById, getUserIdByEmail } from '@/lib/dal';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ItemsContainer from '../../items/ui/components/ItemsContainer';
import ListDetails from '../ui/components/ListDetails';
import ListPrivate from '../ui/components/ListPrivate';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  const { id } = await params;
  const list = await getList(id);

  const title = `${list?.name}`;
  
  return {
    title,
    openGraph: {
      title,
      description: `View ${title}`,
      images: [{
        url: "/ctrlpluslist_preview.jpg",
        width: 1200,
        height: 630,
        alt: "ctrl+list"
      }],
      type: 'website'
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: `View ${title}`,
      images: ["/ctrlpluslist_preview.jpg"]
    }
  };
}

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const user = session?.user?.email
    ? await getUserIdByEmail(session?.user?.email)
    : null;

  const { id } = await params;

  const list = await getList(id);

  if (!user && !list) {
    redirect('/');
  }

  if (!list) {
    redirect('/lists');
  }

  const listOwner = await getUserById(list?.user_id);

  const isOwner = user?.id === list.user_id;

  if (!list.shared && !isOwner) {
    return <ListPrivate loggedIn={!!user} />;
  }

  return (
    <div className={`list-details-container ${user ? '' : 'no-user'}`}>
      <ListDetails isOwner={isOwner} list={list} user_name={listOwner?.name || undefined} user_id={user?.id || undefined} />
      {isOwner ? <SortItemsContainer listId={id} /> : <ItemsContainer listId={id} />}
    </div>
  );
}
