import { auth } from '@/lib/auth';
import { BsBagCheckFill, BsBoxFill } from 'react-icons/bs';
import { IoReceiptOutline } from 'react-icons/io5';
import { LinkButton } from './button';

export default async function Nav() {
  const session = await auth();

  return (
    session?.user && (
      <nav className="nav-container">
        <LinkButton href="/lists" variant="on-dark">
          <IoReceiptOutline />
          <span className="label nav-hide">Lists</span>
        </LinkButton>
        <LinkButton href="/items" variant="on-dark">
          <BsBoxFill />
          <span className="label nav-hide">Items</span>
        </LinkButton>
        <LinkButton href="/purchased" variant="on-dark">
          <BsBagCheckFill />
          <span className="label nav-hide">Purchased</span>
        </LinkButton>
      </nav>
    )
  );
}
