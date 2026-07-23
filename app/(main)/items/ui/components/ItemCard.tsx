import { storeValid } from '@/lib/storeValidity';
import { ItemDisplay } from '@/lib/types';
import ItemActions from './ItemActions';
import ItemPhoto from './ItemPhoto';
import PriceLine from './PriceLine';

export default function ItemCard({
  item,
  className,
  isOwner,
  showPurchased,
  showSpoilerInfo,
  viewerClaimed,
  guestViewer,
  fullyClaimed,
  showCounter,
  counterText,
  showOwnerClaimAction,
  showOwnerManageAction,
  showBuyClaim,
  viewOnly,
  onPurchaseClick,
  onAddClaimClick,
  onBuyClaimClick,
}: {
  item: ItemDisplay;
  className?: string;
  isOwner: boolean;
  showPurchased: boolean;
  showSpoilerInfo: boolean;
  viewerClaimed: boolean;
  /** Signed-out viewer — gates the claimed-guest Add Claim carve-out in ItemActions. */
  guestViewer?: boolean;
  fullyClaimed: boolean;
  showCounter: boolean;
  counterText: string;
  showOwnerClaimAction: boolean;
  showOwnerManageAction: boolean;
  /** Authed non-owner Buy & Claim signal; absent on view-only surfaces. */
  showBuyClaim?: boolean;
  /** Non-interactive preview surfaces render only the live View item link. */
  viewOnly?: boolean;
  /** Absent only in view-only mode, which renders no claim control. */
  onPurchaseClick?: () => void;
  onAddClaimClick?: () => void;
  onBuyClaimClick?: () => void;
}) {
  return (
    <div
      className={`item ${className || ''} ${showPurchased || showSpoilerInfo ? 'purchased' : ''}`}
      title={item.name || ''}
    >
      <ItemPhoto itemId={item.id} name={item.name || ''} url={item.image_url || ''} />
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
          guestViewer={guestViewer}
          showOwnerClaimAction={showOwnerClaimAction}
          showOwnerManageAction={showOwnerManageAction}
          showBuyClaim={showBuyClaim}
          store={storeValid(item.store) ? (item.store ?? null) : null}
          viewOnly={viewOnly}
          onPurchaseClick={onPurchaseClick}
          onAddClaimClick={onAddClaimClick}
          onBuyClaimClick={onBuyClaimClick}
        />
        {showCounter && !isOwner && !showPurchased && (
          <div className="claim-counter">{counterText}</div>
        )}
      </div>
    </div>
  );
}
