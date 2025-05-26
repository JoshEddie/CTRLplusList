import Link from 'next/link';
import { FaPlus } from 'react-icons/fa';

export default function EmptyItem() {
  return (
    <div className="empty-item">
      <h3>No items found</h3>
      <p>Create your first item below.</p>
      <Link className="btn primary" href="/items/new">
        <FaPlus size={14} />
        Create Item
      </Link>
    </div>
  );
}
