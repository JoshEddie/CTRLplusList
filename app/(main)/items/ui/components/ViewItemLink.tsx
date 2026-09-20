import { LinkButton } from '@/app/ui/components/button';
import type {
  ButtonSize,
  ButtonVariant,
} from '@/app/ui/components/button/types';
import { getMessage } from '@/lib/i18n/utils';
import { storeValid, type StoreFields } from '@/lib/storeValidity';
import { MdOpenInNew } from 'react-icons/md';
import './viewItemLink.css';

// The navigable store link, or nothing at all: a PRICED store carries a price
// and no link, and a dormant invalid row never resurrects as one.
export function storeLink(
  store: StoreFields | null | undefined
): string | undefined {
  return storeValid(store) ? store?.link || undefined : undefined;
}

// The item's own store link, wherever one is offered — named for AT, marked as
// leaving the app, and absent when there is nowhere to go. It carries both of
// its labels, so a slot too narrow for the long one swaps them in CSS.
export default function ViewItemLink({
  store,
  variant = 'secondary',
  size,
  className,
  onClick,
}: {
  store: StoreFields | null | undefined;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const link = storeLink(store);
  if (!link) return null;
  return (
    <LinkButton
      variant={variant}
      size={size}
      className={className}
      href={link}
      target="_blank"
      rel="noreferrer"
      aria-label={getMessage('view_item_aria_label')}
      onClick={onClick}
    >
      <span>
        <span className="view-item-link-label">
          {getMessage('view_item_label')}
        </span>
        <span className="view-item-link-short">
          {getMessage('view_item_label_short')}
        </span>
      </span>
      <MdOpenInNew aria-hidden />
    </LinkButton>
  );
}
