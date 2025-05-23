import Link from 'next/link';
import { FaPlus } from 'react-icons/fa';

export default function Empty({type}: {type: string}) {

  const typeCap = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div className="empty-container">
      <h3>No {typeCap}s Found</h3>
      <p>Create your first {typeCap} below.</p>
      <Link className="btn primary" href={`/${type}s/new`}>
        <FaPlus size={14} />
        Create {typeCap}
      </Link>
    </div>
  );
}
