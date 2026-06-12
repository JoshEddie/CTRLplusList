import { PurchaseView } from '@/lib/types';
import { claimLabel } from './utils';

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
  claims,
  claimSummary,
  counterText,
}: {
  showPurchased: boolean;
  myClaim: PurchaseView | null;
  isOwner: boolean;
  showSpoilerInfo: boolean;
  claims: PurchaseView[];
  claimSummary: string;
  counterText: string;
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
          {myClaim.by === 'self'
            ? 'You claimed this'
            : `You claimed this for ${myClaim.firstName}`}
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
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
