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

function claimLabel(claim: PurchaseView): string {
  const name = claim.by === 'self' ? 'You' : claim.firstName;
  return claim.claimerFirstName
    ? `${name} — added by ${claim.claimerFirstName}`
    : name;
}

export default function ClaimBanners({
  showPurchased,
  myClaim,
  isOwner,
  showSpoilerInfo,
  claims,
  counterText,
  onUndo,
  onRemoveClaim,
}: {
  showPurchased: boolean;
  myClaim: PurchaseView | null;
  isOwner: boolean;
  showSpoilerInfo: boolean;
  claims: PurchaseView[];
  counterText: string;
  onUndo: () => void;
  onRemoveClaim: (claim: PurchaseView) => void;
}) {
  const claimSummary = claims
    .map((c) => (c.by === 'self' ? 'You' : c.firstName))
    .join(', ');
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
          {myClaim.by === 'self'
            ? 'You claimed this'
            : `You claimed this for ${myClaim.firstName}`}
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
          <div className="spoiler-claims">
            <span>
              <strong>Spoilers:</strong> {counterText}
            </span>
            <ul className="spoiler-claim-list">
              {claims.map((claim) => (
                <li key={claim.id} className="spoiler-claim-row">
                  <span>{claimLabel(claim)}</span>
                  <button
                    type="button"
                    className="purchased-banner-undo"
                    onClick={() => onRemoveClaim(claim)}
                    aria-label={
                      claim.by === 'self'
                        ? 'Remove your claim'
                        : `Remove ${claim.firstName}'s claim`
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
