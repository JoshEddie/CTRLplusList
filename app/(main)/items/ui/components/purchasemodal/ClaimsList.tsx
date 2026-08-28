import ProfileAvatar, { facelessView } from '@/app/ui/components/ProfileAvatar';
import { Button } from '@/app/ui/components/button';
import { timeAgo } from '@/lib/timeAgo';
import { PurchaseView } from '@/lib/types';
import { useState } from 'react';

// Bounded render: an unlimited-quantity item can carry
// arbitrarily many claims, so the list never renders them all at once.
const INITIAL_VISIBLE = 10;
const SEE_MORE_STEP = 10;

// Long-form label is scoped to this list: the card and spoiler
// banners keep the short "You" via claimLabel.
function rowLabel(claim: PurchaseView): string {
  if (claim.by !== 'self') return claim.firstName;
  return claim.firstName === 'You' ? 'You' : `${claim.firstName} (you)`;
}

// One meta line under the name: "Added by you · 3 hours ago" for attributed
// claims, "claimed 3 hours ago" otherwise — the name line stays free to
// truncate on its own.
function rowMeta(claim: PurchaseView): string | null {
  const when = claim.purchasedAt ? timeAgo(claim.purchasedAt) : '';
  const attribution =
    claim.by !== 'self' && claim.claimedByViewer
      ? 'Added by you'
      : claim.claimerFirstName
        ? `Added by ${claim.claimerFirstName}`
        : null;
  if (attribution) return when ? `${attribution} · ${when}` : attribution;
  return when ? `claimed ${when}` : null;
}

export default function ClaimsList({
  claims,
  canRemove,
  onRemoveClaim,
}: {
  claims: PurchaseView[];
  canRemove: (claim: PurchaseView) => boolean;
  onRemoveClaim: (claim: PurchaseView) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  if (claims.length === 0) return null;
  const sorted = [
    ...claims.filter((claim) => canRemove(claim)),
    ...claims.filter((claim) => !canRemove(claim)),
  ];
  const visible = sorted.slice(0, visibleCount);
  const remaining = sorted.length - visible.length;
  return (
    <div className="claims-section">
      <p className="claims-section-label">Claimed by</p>
      <ul className="claims-list">
        {visible.map((claim) => (
          <li key={claim.id} className="claim-row">
            {/* A free-text purchaser has no profile and so no face: the name
                that was typed is all there is to draw initials from. Account
                linkage governs nothing here — a managed profile carries art on
                the same terms as anyone else. */}
            <ProfileAvatar
              profile={claim.avatar ?? facelessView(claim.firstName)}
            />
            <div className="claim-row-info">
              <span className="claim-row-name">{rowLabel(claim)}</span>
              {rowMeta(claim) && (
                <span className="claim-row-meta">{rowMeta(claim)}</span>
              )}
            </div>
            {canRemove(claim) && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => onRemoveClaim(claim)}
                aria-label={
                  claim.by === 'self'
                    ? 'Remove your claim'
                    : `Remove ${claim.firstName}'s claim`
                }
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <Button
          variant="secondary"
          size="sm"
          className="claims-see-more"
          onClick={() => setVisibleCount((count) => count + SEE_MORE_STEP)}
        >
          See more ({remaining})
        </Button>
      )}
    </div>
  );
}
