import Link from 'next/link';
import { FaPlus } from 'react-icons/fa';

export default function EmptyList() {
  return (
    <div className="empty-list">
      <h3>No lists found</h3>
      <p>Get started by creating your first list.</p>
      <Link className="btn primary" href="/lists/new">
        <FaPlus size={14} />
        Create List
      </Link>
    </div>
  );
}
