import ItemsContainer from '@/app/(main)/items/ui/components/ItemsContainer';
import SortItemsContainer from '@/app/(main)/items/ui/components/SortItemsContainer';
import ListDetails from '@/app/(main)/lists/ui/components/ListDetails';
import ListPrivate from '@/app/(main)/lists/ui/components/ListPrivate';
import { recordVisit } from '@/app/actions/lists';
import { auth } from '@/lib/auth';
import { getList, getUserById, getUserIdByEmail } from '@/lib/dal';
import { guardListViewable } from '@/lib/listAccess';
import { VISIBILITY } from '@/lib/visibility';
import { Metadata } from 'next';
import { after } from 'next/server';

type Props = {
  params: Promise<{ id: string }>;
};

const GENERIC_LIST_TITLE = 'List | ctrl+list';
const NOINDEX: Metadata['robots'] = { index: false, follow: false };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // No list state in this product is meant for stranger discovery via search
  // engines: Shared broadcasts to followers, Private is link-only, and
  // Hidden is owner-only. Every list page is noindex; the per-state work
  // below only decides whether the list NAME may leak into head metadata
  // (which link unfurlers / crawler-pinging services may surface even when
  // they honor the noindex directive themselves).
  let list;
  try {
    list = await getList(id);
  } catch {
    return { title: GENERIC_LIST_TITLE, robots: NOINDEX };
  }
  if (!list) return { title: GENERIC_LIST_TITLE, robots: NOINDEX };

  const isShared = list.visibility === VISIBILITY.FOLLOWERS;

  let isOwner = false;
  if (!isShared) {
    const session = await auth();
    const viewer = session?.user?.email
      ? await getUserIdByEmail(session.user.email)
      : null;
    isOwner = viewer?.id === list.user_id;
  }

  const showFullMetadata = isShared || isOwner;

  if (!showFullMetadata) {
    return { title: GENERIC_LIST_TITLE, robots: NOINDEX };
  }

  const title = `${list.name}`;
  return {
    title,
    robots: NOINDEX,
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

  const list = await guardListViewable(await getList(id), user?.id ?? null);

  const listOwner = await getUserById(list.user_id);

  const isOwner = user?.id === list.user_id;
  const previewMode = isOwner && sp.preview === 'viewer';
  const showSpoilers = isOwner && sp.spoilers === '1';

  if (list.visibility === VISIBILITY.OWNER && !isOwner) {
    return <ListPrivate loggedIn={!!user} />;
  }

  // Record the visit for authenticated non-owner viewers of non-private lists.
  // Deferred via after() because the action calls updateTag, which Next 16
  // disallows during render. Server-side, idempotent on (user_id, list_id).
  if (user && !isOwner && list.visibility !== VISIBILITY.OWNER) {
    after(() => recordVisit(id));
  }

  const effectiveOwner = isOwner && !previewMode;

  return (
    <>
      {!user && <div className="no-user" hidden />}
      <ListDetails
        isOwner={isOwner}
        list={list}
        owner_name={listOwner?.name || undefined}
        owner_image={listOwner?.image || undefined}
        viewer_id={user?.id || undefined}
        showSpoilers={showSpoilers}
        previewMode={previewMode}
        itemCount={list.items?.length ?? 0}
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
