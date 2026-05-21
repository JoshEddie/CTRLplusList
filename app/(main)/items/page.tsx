import { auth } from '@/lib/auth';
import { getItemsByUser, getListsByUser, getUserIdByEmail } from '@/lib/dal';
import { ItemDisplay } from '@/lib/types';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from './ui/components/paginationConstants';
import ItemsPage from './ui/components/ItemsPage';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();

  const user = session?.user?.email
    ? await getUserIdByEmail(session.user.email)
    : null;

  if (!user) {
    redirect('/');
  }

  const sp = await searchParams;
  const purchasesParam =
    typeof sp.purchases === 'string' ? sp.purchases : undefined;
  const showSpoilers =
    purchasesParam === 'reveal' || purchasesParam === 'only';

  const cookieStore = await cookies();
  const rawPageSize = cookieStore.get('items_page_size')?.value;
  const parsedPageSize = rawPageSize ? parseInt(rawPageSize, 10) : NaN;
  const initialPageSize = PAGE_SIZE_OPTIONS.includes(
    parsedPageSize as 12 | 24 | 48 | 96
  )
    ? parsedPageSize
    : DEFAULT_PAGE_SIZE;

  const [activeItems, archivedItems] = await Promise.all([
    getItemsByUser(user.id, { filter: 'active', showSpoilers }),
    getItemsByUser(user.id, { filter: 'archived', showSpoilers }),
  ]);

  const lists = user?.id ? await getListsByUser(user.id) : [];

  const firstLastName: string[] = user?.name ? user.name.split(' ') : [];
  const firstLastInitial =
    firstLastName.length > 1
      ? `${firstLastName[0]} ${firstLastName[1]?.[0]}`
      : firstLastName[0];

  return (
    <main className="container container--items-library">
      <ItemsPage
        items={activeItems as ItemDisplay[]}
        archivedItems={archivedItems as ItemDisplay[]}
        user_id={user?.id}
        user_name={firstLastInitial}
        lists={lists}
        initialPageSize={initialPageSize}
      />
    </main>
  );
}
