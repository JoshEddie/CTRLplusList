import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { auth } from '@/lib/auth';
import { getList } from '@/lib/data/list';
import { getUserIdByEmail } from '@/lib/data/user';
import { VISIBILITY } from '@/lib/visibility';
import { Metadata } from 'next';
import { Suspense } from 'react';
import ListHeroSection from './ListHeroSection';
import ListItemsSection from './ListItemsSection';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
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

export default function ListPage({ params, searchParams }: Props) {
  return (
    <main className="container container--list-details">
      <Suspense fallback={<LoadingIndicator size="rail" />}>
        <ListHeroSection params={params} searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<LoadingIndicator size="page" />}>
        <ListItemsSection params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
