import { storeValid } from '@/lib/storeValidity';
import { ItemDisplay, SpoilerTier } from '@/lib/types';
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
  entryLine,
  hasAnyClaim,
  claimable,
  tier,
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
  /** The entry's line under the row — claim progress or the bare ask. Empty renders nothing. */
  entryLine: string;
  hasAnyClaim: boolean;
  /** A list entry exists to claim against; see ItemActions. */
  claimable: boolean;
  tier: SpoilerTier;
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
          hasAnyClaim={hasAnyClaim}
          claimable={claimable}
          tier={tier}
          showBuyClaim={showBuyClaim}
          store={storeValid(item.store) ? (item.store ?? null) : null}
          viewOnly={viewOnly}
          onPurchaseClick={onPurchaseClick}
          onAddClaimClick={onAddClaimClick}
          onBuyClaimClick={onBuyClaimClick}
        />
        {entryLine && <div className="item-entry-line">{entryLine}</div>}
      </div>
    </div>
  );
}
