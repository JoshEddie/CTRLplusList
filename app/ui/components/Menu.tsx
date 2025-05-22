import Link from 'next/link';
import { Suspense } from 'react';
import Logo from './Logo';
import Nav from './Nav';
import User from './User';

const Menu: React.FC = () => {
  return (
    <div className="menu">
      <Logo />
      <Nav />
      <Suspense fallback={<Link href="/signin">Sign In</Link>}>
        <User />
      </Suspense>
    </div>
  );
};

export default Menu;
