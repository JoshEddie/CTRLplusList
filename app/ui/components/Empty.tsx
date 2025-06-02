import Link from 'next/link';
import { FaPlus } from 'react-icons/fa';

export default function Empty({type}: {type: string}) {

  const typeCap = type.charAt(0).toUpperCase() + type.slice(1);

  const title = type === 'purchase' ? 'No Purchases Found' : `No ${typeCap}s Found`;
  const description = type === 'purchase' ? 'You have not marked any items as purchased yet.' : `Create your first ${typeCap} below.`;

  return (
    <div className="empty-container">
      <h3>{title}</h3>
      <p>{description}</p>
      {type !== 'purchase' && (
        <Link className="btn primary" href={`/${type}s/new`}>
          <FaPlus size={14} />
          Create {typeCap}
        </Link>
      )}
    </div>
  );
}
