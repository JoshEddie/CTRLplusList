import { getMessage } from '@/lib/i18n/utils';
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
  acceptsClaims,
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
  /** A list entry exists to claim against AND still takes new claims; see ItemActions. */
  acceptsClaims: boolean;
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
      <ItemPhoto
        itemId={item.id}
        name={item.name || ''}
        url={item.image_url || ''}
      />
      <div className="item-info">
        {item.removed && (
          <p className="item-removed-note">
            {/* Two readings of one state, and the card knows which viewer it
                has: the owner is being told why a row they removed is still
                here, the claim holder why one they can see is not on the list
                any more. */}
            {getMessage(
              isOwner ? 'entry_removed_owner' : 'entry_removed_viewer'
            )}
          </p>
        )}
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
          acceptsClaims={acceptsClaims}
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
