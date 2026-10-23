import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { getList } from '@/lib/data/list';
import { getMessage } from '@/lib/i18n/utils';
import { Metadata } from 'next';
import { Suspense } from 'react';
import ListHeroSection from './ListHeroSection';
import ListItemsSection from './ListItemsSection';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const NOINDEX: Metadata['robots'] = { index: false, follow: false };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  let list;
  try {
    list = await getList(id);
  } catch {
    return { robots: NOINDEX };
  }
  if (!list) return { robots: NOINDEX };

  const title = list.name;
  const description = getMessage('list_card_shared_by', {
    name: list.profile.name,
  });
  return {
    title,
    description,
    robots: NOINDEX,
    openGraph: {
      title,
      description,
      siteName: getMessage('app_name'),
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
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
