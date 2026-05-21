import { Metadata } from 'next';
import BookmarksPage from './BookmarksPage';

export const metadata: Metadata = { title: 'Bookmarks' };

export default function Page() {
  return (
    <main className="container container--list-collections">
      <BookmarksPage />
    </main>
  );
}
