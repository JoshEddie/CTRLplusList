'use server';

import { Suspense } from 'react';
import User from '../../(auth)/ui/components/User';
import Logo from './Logo';
import Nav from './Nav';

const Menu: React.FC = () => {
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
};

export default Menu;
