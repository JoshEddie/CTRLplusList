import AuthContainer from '@/app/(auth)/ui/components/AuthContainer';
import SignInButton from '@/app/(auth)/ui/components/SignInButton';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { BsBoxFill } from 'react-icons/bs';
import { FaShare, FaShoppingCart } from 'react-icons/fa';
import { MdListAlt } from 'react-icons/md';

export default async function Nav() {
  const session = await auth();

  return session?.user ? (
    <nav className="nav-container">
      <Link href="/lists" className="btn nav">
        <MdListAlt />
        <span className="label mobile-hide">Lists</span>
      </Link>
      <Link href="/items" className="btn nav">
        <BsBoxFill />
        <span className="label mobile-hide">Items</span>
      </Link>
      <Link href="/items/purchased" className="btn nav">
        <FaShoppingCart />
        <span className="label mobile-hide">Purchased</span>
      </Link>
      <Link href="/lists/shared" className="btn nav">
        <FaShare />
        <span className="label mobile-hide">Shared</span>
      </Link>
    </nav>
  ) : (
    <AuthContainer className={`user-menu sign-in`}>
      <p>
        To Access the full features of this site such as creating lists, saving
        shared lists, and tracking purchased items, please sign in.
      </p>
      <SignInButton />
    </AuthContainer>
  );
}
