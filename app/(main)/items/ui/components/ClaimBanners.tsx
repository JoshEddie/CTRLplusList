import { PurchaseView } from '@/lib/types';

function BannerCheck() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function ClaimBanners({
  showPurchased,
  myClaim,
  isOwner,
  showSpoilerInfo,
  claimSummary,
  counterText,
  onUndo,
}: {
  showPurchased: boolean;
  myClaim: PurchaseView | null;
  isOwner: boolean;
  showSpoilerInfo: boolean;
  claimSummary: string;
  counterText: string;
  onUndo: () => void;
}) {
  return (
    <>
      {showPurchased && !myClaim && (
        <div className="purchased-banner" role="status">
          <BannerCheck />
          Claimed by {claimSummary}
        </div>
      )}
      {!isOwner && myClaim && (
        <div className="purchased-banner purchased-banner--mine" role="status">
          <BannerCheck />
          You claimed this
          <button
            type="button"
            className="purchased-banner-undo"
            onClick={onUndo}
            aria-label="Remove your claim"
          >
            Undo
          </button>
        </div>
      )}
      {showSpoilerInfo && (
        <div
          className="purchased-banner purchased-banner--spoiler"
          role="status"
        >
          <BannerCheck />
          <span>
            <strong>Spoilers:</strong> {counterText}
            {claimSummary && ` — ${claimSummary}`}
          </span>
        </div>
      )}
    </>
  );
}
