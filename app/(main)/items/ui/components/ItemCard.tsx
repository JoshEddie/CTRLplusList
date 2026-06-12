import { ItemDisplay, PurchaseView } from '@/lib/types';
import ItemPhoto from './ItemPhoto';
import Purchase from './Purchase';
import StoreLinks from './StoreLinks';
import StoreMetadataLine from './StoreMetadataLine';
import { formatStorePrice, lowestPricedStore } from './utils';

function PriceRow({ item }: { item: ItemDisplay }) {
  const lowest = lowestPricedStore(item.stores);
  if (!lowest) return null;
  return (
    <div className="item-price-row">
      <span className="item-price">{formatStorePrice(lowest.price)}</span>
    </div>
  );
}

export default function ItemCard({
  item,
  className,
  isOwner,
  showPurchased,
  showSpoilerInfo,
  removableClaim,
  claimActionDisabled,
  showCounter,
  counterText,
  showOwnerClaimAction,
  showOwnerManageAction,
  onPurchaseClick,
}: {
  item: ItemDisplay;
  className?: string;
  isOwner: boolean;
  showPurchased: boolean;
  showSpoilerInfo: boolean;
  removableClaim: PurchaseView | null;
  claimActionDisabled: boolean;
  showCounter: boolean;
  counterText: string;
  showOwnerClaimAction: boolean;
  showOwnerManageAction: boolean;
  onPurchaseClick: () => void;
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
        {isOwner ? (
          <>
            {/* Spoilers on is claim-management mode: the claim affordance
                replaces the chip row (store access lives in its modal).
                showSpoilerInfo covers claimed items, showOwnerClaimAction
                the still-claimable ones. */}
            <StoreLinks
              item={item}
              showStores={!showSpoilerInfo && !showOwnerClaimAction}
            />
            {showOwnerManageAction ? (
              <Purchase ownerManage handlePurchaseClick={onPurchaseClick} />
            ) : showOwnerClaimAction ? (
              <Purchase ownerClaim handlePurchaseClick={onPurchaseClick} />
            ) : null}
          </>
        ) : (
          <>
            {viewerClaimed || claimActionDisabled ? (
              <PriceRow item={item} />
            ) : (
              <StoreMetadataLine item={item} />
            )}
            <Purchase
              viewerClaimed={viewerClaimed}
              fullyClaimed={claimActionDisabled}
              handlePurchaseClick={onPurchaseClick}
            />
          </>
        )}
        {showCounter && !isOwner && !showPurchased && (
          <div className="claim-counter">{counterText}</div>
        )}
      </div>
    </div>
  );
}
