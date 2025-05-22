import Link from 'next/link';
import { BsBoxFill } from 'react-icons/bs';
import { FaShare, FaShoppingCart } from 'react-icons/fa';
import { MdListAlt } from 'react-icons/md';

export default function Nav() {
  return (
    <nav className="nav-container">
      <div className="nav-content">
        <div className="nav-section">
          <div className="nav-items">
            <Link href="/lists" className="btn nav">
              <MdListAlt />
              Lists
            </Link>
            <Link href="/items" className="btn nav">
              <BsBoxFill /> Items
            </Link>
            <Link href="/items/purchased" className="btn nav">
              <FaShoppingCart /> Purchased
            </Link>
            <Link href="/lists/shared" className="btn nav">
              <FaShare /> Shared With Me
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
