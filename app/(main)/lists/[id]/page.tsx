import ItemsContainer from '@/app/(main)/items/ui/components/ItemsContainer';
import SortItemsContainer from '@/app/(main)/items/ui/components/SortItemsContainer';
import ListDetails from '@/app/(main)/lists/ui/components/ListDetails';
import ListPrivate from '@/app/(main)/lists/ui/components/ListPrivate';
import { auth } from '@/lib/auth';
import { getList, getUserById, getUserIdByEmail } from '@/lib/dal';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const list = await getList(id);

  const title = `${list?.name}`;

  return {
    title,
    openGraph: {
      title,
      description: `View ${title}`,
      images: [
        {
          url: '/ctrlpluslist_preview.jpg',
          width: 1200,
          height: 630,
          alt: 'ctrl+list',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: `View ${title}`,
      images: ['/ctrlpluslist_preview.jpg'],
    },
  };
}

export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const user = session?.user?.email
    ? await getUserIdByEmail(session?.user?.email)
    : null;

  const { id } = await params;
  const sp = await searchParams;

  const list = await getList(id);

  if (!user && !list) {
    redirect('/');
  }

  if (!list) {
    redirect('/lists');
  }

  const listOwner = await getUserById(list?.user_id);

  const isOwner = user?.id === list.user_id;
  const previewMode = isOwner && sp.preview === 'viewer';
  const showSpoilers = isOwner && sp.spoilers === '1';

  if (!list.shared && !isOwner) {
    return <ListPrivate loggedIn={!!user} />;
  }

  const effectiveOwner = isOwner && !previewMode;

  return (
    <>
      {!user && <div className="no-user" hidden />}
      <ListDetails
        isOwner={isOwner}
        list={list}
        user_name={listOwner?.name || undefined}
        user_id={user?.id || undefined}
        showSpoilers={showSpoilers}
        previewMode={previewMode}
      />
      {effectiveOwner ? (
        <SortItemsContainer
          listId={id}
          isOwner={true}
          showSpoilers={showSpoilers}
        />
      ) : (
        <ItemsContainer
          listId={id}
          // In preview mode, route through the owner-sanitize path so the
          // spoilers toggle fully gates visibility (off = nothing, on = full names)
          // instead of leaking first names regardless.
          isListOwner={previewMode}
          viewerId={user?.id}
          showSpoilers={showSpoilers}
        />
      )}
    </>
  );
}
