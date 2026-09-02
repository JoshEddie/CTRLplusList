import ProfileAvatar, { facelessView } from '@/app/ui/components/ProfileAvatar';
import { Button } from '@/app/ui/components/button';
import { timeAgo } from '@/lib/timeAgo';
import { PurchaseView } from '@/lib/types';
import { useState } from 'react';

// Bounded render: an entry asking for many units can carry as many claims, so
// the list never renders them all at once.
const INITIAL_VISIBLE = 10;
const SEE_MORE_STEP = 10;

type NamedClaim = PurchaseView & { name: string };

// Long-form label is scoped to this list: the card and spoiler banners carry a
// bare count instead.
function rowLabel(claim: NamedClaim): string {
  const name = claim.name;
  if (claim.by !== 'self') return name;
  return name === 'You' ? 'You' : `${name} (you)`;
}

// One meta line under the name: "Added by you · 3 hours ago" for attributed
// claims, "claimed 3 hours ago" otherwise — the name line stays free to
// truncate on its own.
function rowMeta(claim: PurchaseView): string | null {
  const when = claim.purchasedAt ? timeAgo(claim.purchasedAt) : '';
  const attribution =
    claim.by !== 'self' && claim.claimedByViewer
      ? 'Added by you'
      : claim.claimerName
        ? `Added by ${claim.claimerName}`
        : null;
  if (attribution) return when ? `${attribution} · ${when}` : attribution;
  return when ? `claimed ${when}` : null;
}

export default function ClaimsList({
  claims,
  canRemove,
  removalDisabled = false,
  onRemoveClaim,
}: {
  claims: PurchaseView[];
  canRemove: (claim: PurchaseView) => boolean;
  // Which removal a row offers depends on who is listed: the owner's list is
  // master unclaim and takes the owner floor, the manage view is the viewer's
  // own claims and takes none. The caller knows which it opened, so the floor
  // arrives decided rather than being read here.
  removalDisabled?: boolean;
  onRemoveClaim: (claim: PurchaseView) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  if (claims.length === 0) return null;
  const sorted = [
    ...claims.filter((claim) => canRemove(claim)),
    ...claims.filter((claim) => !canRemove(claim)),
  ];
  // A projected-away claim carries nothing that may be shown — no avatar, name,
  // date, attribution line or removal — so it is not a row at all, only a
  // count. The missing name is the tell, not the viewer's removal rights: the
  // owner may remove every claim on their item, named or not.
  const named = sorted.filter(
    (claim): claim is NamedClaim => claim.name !== undefined
  );
  const withheld = sorted.length - named.length;
  const visible = named.slice(0, visibleCount);
  const remaining = named.length - visible.length;
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
            <ProfileAvatar profile={claim.avatar ?? facelessView(claim.name)} />
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
                disabled={removalDisabled}
                onClick={() => onRemoveClaim(claim)}
                aria-label={
                  claim.by === 'self'
                    ? 'Remove your claim'
                    : `Remove ${claim.name}'s claim`
                }
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>
      {withheld > 0 && (
        <p className="claims-withheld" role="status">
          {withheld === 1 ? '1 other claim' : `${withheld} other claims`}
        </p>
      )}
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
