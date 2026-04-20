import { Suspense } from 'react';
import Menu from '../ui/components/Menu';
import MainShell from './MainShell';
import './items/ui/styles/item.css';
import './lists/ui/styles/list.css';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Menu />
      <Suspense fallback={<main className="container" />}>
        <MainShell>{children}</MainShell>
      </Suspense>
    </>
  );
}
