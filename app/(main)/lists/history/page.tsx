import { Metadata } from 'next';
import HistoryPage from './HistoryPage';

export const metadata: Metadata = { title: 'Visit history' };

export default function Page() {
  return (
    <main className="container container--list-collections">
      <HistoryPage />
    </main>
  );
}
