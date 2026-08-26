'use client';

import { FaPlus } from 'react-icons/fa';
import { Button, LinkButton } from './button';
import type { EmptySecondaryAction } from '@/lib/types';

export default function Empty({
  type,
  setShowNewItem,
  secondaryAction,
}: {
  type: string;
  setShowNewItem?: (show: boolean) => void;
  secondaryAction?: EmptySecondaryAction;
}) {
  const typeCap = type.charAt(0).toUpperCase() + type.slice(1);

  const title =
    type === 'purchase' ? 'No Purchases Found' : `No ${typeCap}s Found`;
  // With a secondary action offered, the description scopes the emptiness to
  // the profile being acted as — an empty surface looks identical for every
  // profile, so this is exactly where a viewer who has switched reads another
  // profile's view as their own content having vanished. It names no profile,
  // and claims nothing about what the others hold: a viewer whose profiles are
  // all empty is told the truth too.
  const description =
    type === 'purchase'
      ? 'You have not marked any items as purchased yet.'
      : secondaryAction
        ? `This profile has no ${typeCap}s yet — create one below, or switch profiles.`
        : `Create your first ${typeCap} below.`;

  const cta = setShowNewItem ? (
    <Button variant="primary" onClick={() => setShowNewItem(true)}>
      <FaPlus size={14} />
      Create {typeCap}
    </Button>
  ) : (
    <LinkButton href={`/${type}s/new`} variant="primary">
      <FaPlus size={14} />
      Create {typeCap}
    </LinkButton>
  );

  return (
    <div className="empty-container">
      <h3>{title}</h3>
      <p>{description}</p>
      {type !== 'purchase' &&
        // The row exists only when there are two affordances to sit side by
        // side, so a consumer that supplies none renders exactly the DOM the
        // sibling requirements describe.
        (secondaryAction ? (
          <div className="empty-actions">
            {cta}
            <LinkButton href={secondaryAction.href} variant="secondary">
              {secondaryAction.label}
            </LinkButton>
          </div>
        ) : (
          cta
        ))}
    </div>
  );
}
