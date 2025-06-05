import { auth } from '@/lib/auth';
import Link from 'next/link';
import { BsBagCheckFill, BsBoxFill } from 'react-icons/bs';
import { IoReceiptOutline } from 'react-icons/io5';

export default async function Nav() {
  const session = await auth();

  return session?.user && (
    <nav className="nav-container">
      <Link href="/lists" className="btn nav">
        <IoReceiptOutline />
        <span className="label nav-hide">Lists</span>
      </Link>
      <Link href="/items" className="btn nav">
        <BsBoxFill />
        <span className="label nav-hide">Items</span>
      </Link>
      <Link href="/purchased" className="btn nav">
        <BsBagCheckFill />
        <span className="label nav-hide">Purchased</span>
      </Link>
    </nav>
  )
}
