import ProfileAvatar, { facelessView } from '@/app/ui/components/ProfileAvatar';
import { Button } from '@/app/ui/components/button';
import { getMessage } from '@/lib/i18n/utils';
import { timeAgo } from '@/lib/timeAgo';
import { EntryCapacity, PurchaseView } from '@/lib/types';
import { useState } from 'react';
import { claimUnitsCeiling } from '../utils';
import UnitsField from './UnitsField';

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
  // A nameless claim already carries the viewer's stand-in name, which says
  // "you" on its own — suffixing it would read "You (you)".
  if (name === getMessage('viewer_name_placeholder')) return name;
  return getMessage('claim_row_name_own', { name });
}

// One meta line under the name: "Added by you · 3 hours ago" for attributed
// claims, "claimed 3 hours ago" otherwise — the name line stays free to
// truncate on its own.
function rowMeta(claim: PurchaseView): string | null {
  const when = claim.purchasedAt ? timeAgo(claim.purchasedAt) : '';
  const attribution =
    claim.by !== 'self' && claim.claimedByViewer
      ? getMessage('claim_row_meta_added_by_viewer')
      : claim.claimerName
        ? getMessage('claim_row_meta_added_by', { name: claim.claimerName })
        : null;
  if (attribution)
    return when
      ? getMessage('claim_row_meta_with_time', { attribution, when })
      : attribution;
  return when ? getMessage('claim_row_meta_claimed', { when }) : null;
}

export default function ClaimsList({
  claims,
  canRemove,
  capacity,
  removalDisabled = false,
  onRemoveClaim,
  onUpdateUnits,
}: {
  claims: PurchaseView[];
  canRemove: (claim: PurchaseView) => boolean;
  /** What is left of the entry's ask, which bounds how far a claim on it can be raised. Null off a list. */
  capacity?: EntryCapacity | null;
  // Which removal a row offers depends on who is listed: the owner's list is
  // master unclaim and takes the owner floor, the manage view is the viewer's
  // own claims and takes none. The caller knows which it opened, so the floor
  // arrives decided rather than being read here.
  removalDisabled?: boolean;
  onRemoveClaim: (claim: PurchaseView) => void;
  onUpdateUnits?: (claim: PurchaseView, units: number) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const ceilingFor = (claim: PurchaseView) =>
    claimUnitsCeiling(capacity, claim);
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
      <p className="claims-section-label">{getMessage('claim_list_label')}</p>
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
                    ? getMessage('claim_remove_own_aria_label')
                    : getMessage('claim_remove_other_aria_label', {
                        name: claim.name,
                      })
                }
              >
                {getMessage('claim_remove_label')}
              </Button>
            )}
            {canRemove(claim) &&
              !removalDisabled &&
              onUpdateUnits &&
              ceilingFor(claim) > 1 && (
                <UnitsField
                  label={getMessage('claim_units_row_label')}
                  value={drafts[claim.id] ?? String(claim.units ?? 1)}
                  max={ceilingFor(claim)}
                  onChange={(next) =>
                    setDrafts((prev) => ({ ...prev, [claim.id]: next }))
                  }
                  onSubmit={(units) => onUpdateUnits(claim, units)}
                />
              )}
          </li>
        ))}
      </ul>
      {withheld > 0 && (
        <p className="claims-withheld" role="status">
          {getMessage('claim_withheld_others', { count: withheld })}
        </p>
      )}
      {remaining > 0 && (
        <Button
          variant="secondary"
          size="sm"
          className="claims-see-more"
          onClick={() => setVisibleCount((count) => count + SEE_MORE_STEP)}
        >
          {getMessage('claim_see_more', { count: remaining })}
        </Button>
      )}
    </div>
  );
}
