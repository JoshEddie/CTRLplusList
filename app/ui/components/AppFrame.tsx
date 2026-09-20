import { Suspense } from 'react';
import User from '../../(auth)/ui/components/User';
import AppLogo from './AppLogo';
import AppNav from './AppNav';

export default function AppFrame({
  children,
  gated,
}: {
  children: React.ReactNode;
  gated?: boolean;
}) {
  return (
    <div className="app-frame" {...(gated ? { 'data-gated': '' } : {})}>
      <header className="app-nav">
        <div className="app-nav-inner">
          <AppLogo />
          <Suspense fallback={null}>
            <AppNav />
          </Suspense>
          <div className="app-nav-avatar">
            <Suspense fallback={null}>
              <User />
            </Suspense>
          </div>
        </div>
      </header>
      <div className="app-surface-bleed">
        <div className="app-surface">{children}</div>
      </div>
    </div>
  );
}
