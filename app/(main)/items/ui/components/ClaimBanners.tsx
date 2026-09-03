// TODO(#343): split the extra components into their own files, then drop this disable
/* eslint-disable react/no-multi-comp */

import { getMessage } from '@/lib/i18n/utils';
import { PurchaseView, SpoilerTier } from '@/lib/types';
import { showsSpoilerBanner } from './utils';

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
    .map((claim) => claim.name ?? getMessage('someone_name_placeholder'));
  const hasSelf = myClaims.some((claim) => claim.by === 'self');
  if (attributed.length === 0) return getMessage('claim_banner_for_self');
  const names = attributed.join(', ');
  return hasSelf
    ? getMessage('claim_banner_for_self_and_others', { names })
    : getMessage('claim_banner_for_others', { names });
}

export default function ClaimBanners({
  showPurchased,
  myClaims,
  isOwner,
  tier,
  claims,
  claimSummary,
  counterText,
  claimable,
}: {
  showPurchased: boolean;
  myClaims: PurchaseView[];
  isOwner: boolean;
  tier: SpoilerTier;
  claims: PurchaseView[];
  claimSummary: string;
  counterText: string;
  /** A list entry backs this card, so the counter has a capacity to report. */
  claimable: boolean;
}) {
  const showSpoilerInfo = showsSpoilerBanner(isOwner, tier, claims.length > 0);
  // One home for the line: the spoiler banner shows it off a list, where there
  // is no entry and so no capacity for the counter to report.
  const claimedByLine = getMessage('claim_banner_claimed_by', {
    summary: claimSummary,
  });
  return (
    <>
      {showPurchased && myClaims.length === 0 && (
        <div className="purchased-banner" role="status">
          <BannerCheck />
          {claimedByLine}
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
          {/* The count and the remaining capacity are all `claims` grants; who
              holds each claim is the modal's confirmed reveal alone. */}
          <span>{claimable ? counterText : claimedByLine}</span>
        </div>
      )}
    </>
  );
}
