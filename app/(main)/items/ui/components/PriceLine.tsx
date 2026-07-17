import { ItemDisplay } from '@/lib/types';
import '../styles/store-links.css';
import { formatStorePrice, lowestPricedStore } from './utils';

// Inert metadata — store navigation is carried exclusively by ItemActions'
// View item link, uniformly across claim states.
export default function PriceLine({ item }: { item: ItemDisplay }) {
  const primary = lowestPricedStore(item.stores);
  if (!primary) return null;
  return (
    <div className="item-price-row item-price-row--metadata">
      <span className="item-price">{formatStorePrice(primary.price)}</span>
      <span className="item-store-metadata">&nbsp;· {primary.name}</span>
    </div>
  );
}
