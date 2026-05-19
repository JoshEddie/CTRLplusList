import { Suspense } from 'react';
import User from '../../(auth)/ui/components/User';
import AppLogo from './AppLogo';
import AppNav from './AppNav';

export default function AppFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-frame">
      <header className="app-nav">
        <AppLogo />
        <Suspense fallback={null}>
          <AppNav />
        </Suspense>
        <div className="app-nav-avatar">
          <Suspense fallback={null}>
            <User />
          </Suspense>
        </div>
      </header>
      <div className="app-surface-bleed">
        <div className="app-surface">{children}</div>
      </div>
    </div>
  );
}
