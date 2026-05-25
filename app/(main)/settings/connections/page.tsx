import { Metadata } from 'next';
import ConnectionsPage from './ConnectionsPage';

export const metadata: Metadata = { title: 'Connections' };

export default function Page() {
  return <ConnectionsPage />;
}
