import { Suspense } from 'react';
import User from '../../(auth)/ui/components/User';
import Logo from './Logo';
import Nav from './Nav';

export default async function AppMenu() {
  return (
    <div className="menu">
      <Logo />
      <Suspense fallback={<></>}>
        <Nav />
      </Suspense>

      <Suspense fallback={<></>}>
        <User />
      </Suspense>
    </div>
  );
}
