'use client';

import ItemPhoto from '@/app/(main)/items/ui/components/ItemPhoto';
import PriceLine from '@/app/(main)/items/ui/components/PriceLine';
import { LinkButton } from '@/app/ui/components/button';
import { CheckboxField } from '@/app/ui/components/field/CheckboxField';
import { getMessage } from '@/lib/i18n/utils';
import { storeValid } from '@/lib/storeValidity';
import { ItemDisplay } from '@/lib/types';
import type { ReactNode } from 'react';
import { MdOpenInNew } from 'react-icons/md';

// No claim state on purpose: a claim belongs to a list entry, not to an item,
// so a library row surfaced here carries none this list could judge.
export default function EditModeRow({
  item,
  inList,
  pending,
  onToggle,
  handle,
}: {
  item: ItemDisplay;
  inList: boolean;
  /** Differs from what is saved — added, removed, re-quantified, or moved. */
  pending: boolean;
  onToggle: (itemId: string) => void;
  /** The drag handle, supplied only by the sortable wrapper. */
  handle?: ReactNode;
}) {
  const checkboxId = `edit-mode-item-${item.id}`;
  const name = item.name ?? '';
  const link = storeValid(item.store) ? item.store?.link : undefined;
  return (
    <label
      htmlFor={checkboxId}
      className={`edit-mode-row ${inList ? 'is-on' : 'is-off'}${
        pending ? ' is-pending' : ''
      }`}
    >
      <div className="edit-mode-row-handle">{handle}</div>
      <ItemPhoto itemId={item.id} name={name} url={item.image_url || ''} />
      <div className="edit-mode-row-main">
        <span className="itemName">
          {name}
          {pending && (
            <span
              className="edit-mode-pending"
              role="img"
              aria-label={getMessage('edit_mode_pending_change_label')}
            />
          )}
        </span>
        <div className="edit-mode-row-meta">
          <PriceLine item={item} />
          {link && (
            <LinkButton
              variant="secondary"
              size="sm"
              className="edit-mode-row-view"
              href={link}
              target="_blank"
              rel="noreferrer"
              aria-label={getMessage('view_item_aria_label')}
            >
              {getMessage('view_item_label')}
              <MdOpenInNew aria-hidden />
            </LinkButton>
          )}
        </div>
        {item.description && (
          <p className="edit-mode-row-note">{item.description}</p>
        )}
      </div>
      <span className="edit-mode-row-label">
        {inList ? '' : getMessage('edit_mode_not_in_list_label')}
      </span>
      {/* The outer label would otherwise read the whole row into the box's
          accessible name, price and section label included. */}
      <CheckboxField
        id={checkboxId}
        label={name}
        aria-label={name}
        checked={inList}
        onChange={() => onToggle(item.id)}
      />
    </label>
  );
}
