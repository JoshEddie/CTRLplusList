import { PurchaseView, SpoilerTier } from '@/lib/types';
import { claimLabel, showsSpoilerBanner } from './utils';

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

function myClaimsLabel(myClaims: PurchaseView[]): string {
  const attributed = myClaims
    .filter((claim) => claim.by !== 'self')
    .map((claim) => claim.firstName ?? 'Someone');
  const hasSelf = myClaims.some((claim) => claim.by === 'self');
  if (attributed.length === 0) return 'You claimed this';
  const names = attributed.join(', ');
  return hasSelf
    ? `You claimed this, and for ${names}`
    : `You claimed this for ${names}`;
}

export default function ClaimBanners({
  showPurchased,
  myClaims,
  isOwner,
  tier,
  claims,
  claimSummary,
  counterText,
}: {
  showPurchased: boolean;
  myClaims: PurchaseView[];
  isOwner: boolean;
  tier: SpoilerTier;
  claims: PurchaseView[];
  claimSummary: string;
  counterText: string;
}) {
  const showSpoilerInfo = showsSpoilerBanner(isOwner, tier, claims.length > 0);
  return (
    <>
      {showPurchased && myClaims.length === 0 && (
        <div className="purchased-banner" role="status">
          <BannerCheck />
          Claimed by {claimSummary}
        </div>
      )}
      {!isOwner && myClaims.length > 0 && (
        <div className="purchased-banner purchased-banner--mine" role="status">
          <BannerCheck />
          {myClaimsLabel(myClaims)}
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
            {/* The count and the remaining capacity are what `claims` grants;
                who holds each claim rides the `identity` tier alone. */}
            {tier === 'identity' && (
              <ul className="spoiler-claim-list">
                {claims.map((claim) => (
                  <li key={claim.id} className="spoiler-claim-row">
                    <span>{claimLabel(claim)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
