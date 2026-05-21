'use client';

import { FaPlus } from 'react-icons/fa';
import { Button, LinkButton } from './button';

export default function Empty({
  type,
  setShowNewItem,
}: {
  type: string;
  setShowNewItem?: (show: boolean) => void;
}) {
  const typeCap = type.charAt(0).toUpperCase() + type.slice(1);

  const title =
    type === 'purchase' ? 'No Purchases Found' : `No ${typeCap}s Found`;
  const description =
    type === 'purchase'
      ? 'You have not marked any items as purchased yet.'
      : `Create your first ${typeCap} below.`;

  return (
    <div className="empty-container">
      <h3>{title}</h3>
      <p>{description}</p>
      {type !== 'purchase' && setShowNewItem ? (
        <Button variant="primary" onClick={() => setShowNewItem(true)}>
          <FaPlus size={14} />
          Create {typeCap}
        </Button>
      ) : (
        <LinkButton href={`/${type}s/new`} variant="primary">
          <FaPlus size={14} />
          Create {typeCap}
        </LinkButton>
      )}
    </div>
  );
}
