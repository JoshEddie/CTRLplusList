import { Suspense } from 'react';
import AppFrame from '../ui/components/AppFrame';
import '../ui/styles/app-frame.css';
import ListLoading from './lists/ui/components/ListLoading';
import './lists/ui/styles/list-loading.css';
import MainShell from './MainShell';
import './items/ui/styles/item.css';
import './lists/ui/styles/following-and-history.css';
import './lists/ui/styles/list.css';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppFrame>
      <Suspense fallback={<ListLoading />}>
        <MainShell>{children}</MainShell>
      </Suspense>
    </AppFrame>
  );
}
