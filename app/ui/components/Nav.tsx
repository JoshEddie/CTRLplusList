import { auth } from '@/lib/auth';
import Link from 'next/link';
import { BsBoxFill } from 'react-icons/bs';
import { FaShoppingCart } from 'react-icons/fa';
import { MdListAlt } from 'react-icons/md';

export default async function Nav() {
  const session = await auth();

  return session?.user && (
    <nav className="nav-container">
      <Link href="/lists" className="btn nav">
        <MdListAlt />
        <span className="label nav-hide">Lists</span>
      </Link>
      <Link href="/items" className="btn nav">
        <BsBoxFill />
        <span className="label nav-hide">Items</span>
      </Link>
      <Link href="/items/purchased" className="btn nav">
        <FaShoppingCart />
        <span className="label nav-hide">Purchased</span>
      </Link>
    </nav>
  )
}
