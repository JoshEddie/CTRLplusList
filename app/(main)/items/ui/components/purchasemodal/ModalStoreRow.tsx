'use client';

import { LinkButton } from '@/app/ui/components/button';
import { ItemStoreTable } from '@/lib/types';
import { MdOpenInNew } from 'react-icons/md';
import '../../styles/store-links.css';
import { formatStorePrice, lowestPricedStore } from '../utils';

export default function ModalStoreRow({
  stores,
}: {
  stores: ItemStoreTable[] | null | undefined;
}) {
  const primary = lowestPricedStore(stores);

  if (!primary) return null;

  return (
    <div className="modal-store-row">
      <LinkButton
        variant="ghost"
        className="storeLinks-link modal-store-row-link"
        href={primary.link}
        target="_blank"
        rel="noreferrer"
      >
        {primary.name} · {formatStorePrice(primary.price)}
        <MdOpenInNew aria-hidden />
      </LinkButton>
    </div>
  );
}
