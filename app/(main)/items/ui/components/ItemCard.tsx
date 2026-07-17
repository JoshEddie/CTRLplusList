import { ItemDisplay, PurchaseView } from '@/lib/types';
import ItemActions from './ItemActions';
import ItemPhoto from './ItemPhoto';
import PriceLine from './PriceLine';
import { lowestPricedStore } from './utils';

export default function ItemCard({
  item,
  className,
  isOwner,
  showPurchased,
  showSpoilerInfo,
  removableClaim,
  fullyClaimed,
  showCounter,
  counterText,
  showOwnerClaimAction,
  showOwnerManageAction,
  viewOnly,
  onPurchaseClick,
}: {
  item: ItemDisplay;
  className?: string;
  isOwner: boolean;
  showPurchased: boolean;
  showSpoilerInfo: boolean;
  removableClaim: PurchaseView | null;
  fullyClaimed: boolean;
  showCounter: boolean;
  counterText: string;
  showOwnerClaimAction: boolean;
  showOwnerManageAction: boolean;
  /** Non-interactive preview surfaces render only the live View item link. */
  viewOnly?: boolean;
  /** Absent only in view-only mode, which renders no claim control. */
  onPurchaseClick?: () => void;
}) {
  const viewerClaimed = !isOwner && !!removableClaim;

  return (
    <div
      className={`item ${className || ''} ${showPurchased || showSpoilerInfo ? 'purchased' : ''}`}
      title={item.name || ''}
    >
      <ItemPhoto name={item.name || ''} url={item.image_url || ''} />
      <div className="item-info">
        <div className="item-name-description">
          <h1 className="itemName">{item.name || ''}</h1>
          {item.description ? (
            <p className="itemDescription">{item.description}</p>
          ) : null}
        </div>
        <PriceLine item={item} />
        <ItemActions
          isOwner={isOwner}
          fullyClaimed={fullyClaimed}
          viewerClaimed={viewerClaimed}
          showOwnerClaimAction={showOwnerClaimAction}
          showOwnerManageAction={showOwnerManageAction}
          store={lowestPricedStore(item.stores)}
          viewOnly={viewOnly}
          onPurchaseClick={onPurchaseClick}
        />
        {showCounter && !isOwner && !showPurchased && (
          <div className="claim-counter">{counterText}</div>
        )}
      </div>
    </div>
  );
}
