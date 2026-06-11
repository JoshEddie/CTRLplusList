import { ItemDisplay, PurchaseView } from '@/lib/types';
import ItemPhoto from './ItemPhoto';
import Purchase from './Purchase';
import StoreLinks from './StoreLinks';

export default function ItemCard({
  item,
  className,
  isOwner,
  showPurchased,
  showSpoilerInfo,
  myClaim,
  claimSummary,
  claimActionDisabled,
  showCounter,
  counterText,
  showOwnerClaimAction,
  onPurchaseClick,
}: {
  item: ItemDisplay;
  className?: string;
  isOwner: boolean;
  showPurchased: boolean;
  showSpoilerInfo: boolean;
  myClaim: PurchaseView | null;
  claimSummary: string;
  claimActionDisabled: boolean;
  showCounter: boolean;
  counterText: string;
  showOwnerClaimAction: boolean;
  onPurchaseClick: () => void;
}) {
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
        <StoreLinks item={item} showStores={!showPurchased && !showSpoilerInfo}>
          {(!isOwner || showOwnerClaimAction) && (
            <Purchase
              purchasedBy={
                showPurchased ? (myClaim ? 'You' : claimSummary) : undefined
              }
              handlePurchaseClick={onPurchaseClick}
              className={showPurchased ? 'purchased' : ''}
              disabled={claimActionDisabled}
              fullyClaimedLabel={claimActionDisabled ? 'Fully claimed' : undefined}
            />
          )}
        </StoreLinks>
        {showCounter && !isOwner && !showPurchased && (
          <div className="claim-counter">{counterText}</div>
        )}
      </div>
    </div>
  );
}
