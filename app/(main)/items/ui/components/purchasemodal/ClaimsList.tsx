import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import { Button } from '@/app/ui/components/button';
import { getMessage } from '@/lib/i18n/utils';
import { timeAgo } from '@/lib/timeAgo';
import { EntryCapacity, PurchaseView } from '@/lib/types';
import { useState } from 'react';
import { claimAvatar, claimUnitsCeiling } from '../utils';
import UnitsField from './UnitsField';

// Bounded render: an entry asking for many units can carry as many claims, so
// the list never renders them all at once.
const INITIAL_VISIBLE = 10;
const SEE_MORE_STEP = 10;

// Long-form label is scoped to this list: the card and spoiler banners carry a
// bare count instead.
function rowLabel(claim: PurchaseView): string {
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
  unitsStatus,
  removalDisabled = false,
  onRemoveClaim,
  onUpdateUnits,
}: {
  claims: PurchaseView[];
  canRemove: (claim: PurchaseView) => boolean;
  /** What is left of the entry's ask, which bounds how far a claim on it can be raised. Null off a list. */
  capacity?: EntryCapacity | null;
  /** What the entry already has spoken for. Passed rather than derived: capacity states a remainder at every tier, but below `claims` it is drawn from a withheld count and would read as a false zero. */
  unitsStatus?: string;
  // Which removal a row offers depends on who is listed: the owner's list is
  // master unclaim and takes the owner floor, the manage view is the viewer's
  // own claims and takes none. The caller knows which it opened, so the floor
  // arrives decided rather than being read here.
  removalDisabled?: boolean;
  onRemoveClaim: (claim: PurchaseView) => void;
  onUpdateUnits?: (claim: PurchaseView, units: number) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const ceilingFor = (claim: PurchaseView) =>
    claimUnitsCeiling(capacity, claim);
  // A row either sets its units or states them. Editing is the removal right
  // again — dropping a claim to zero IS removing it — so it takes the same
  // floor, and a ceiling of one leaves no number to pick.
  const editable = (claim: PurchaseView) =>
    canRemove(claim) && !removalDisabled && !!onUpdateUnits && ceilingFor(claim) > 1;
  // Whether the entry is one a claim can cover part of. On an entry asking for
  // one there is no split to read, and "1 unit" on every row would say nothing.
  const splits = (capacity?.quantity ?? 1) > 1;
  if (claims.length === 0) return null;
  const sorted = [
    ...claims.filter((claim) => canRemove(claim)),
    ...claims.filter((claim) => !canRemove(claim)),
  ];
  const visible = sorted.slice(0, visibleCount);
  const remaining = sorted.length - visible.length;
  return (
    <div className="claims-section">
      <p className="claims-section-label">{getMessage('claim_list_label')}</p>
      <ul className="claims-list">
        {visible.map((claim) => (
          <li key={claim.id} className="claim-row">
            <ProfileAvatar profile={claimAvatar(claim)} />
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
            {editable(claim) ? (
              <UnitsField
                label={getMessage('claim_units_row_label')}
                status={unitsStatus}
                value={drafts[claim.id] ?? claim.units ?? 1}
                max={ceilingFor(claim)}
                saved={claim.units ?? 1}
                onChange={(next) =>
                  setDrafts((prev) => ({ ...prev, [claim.id]: next }))
                }
                onSubmit={(units) => onUpdateUnits!(claim, units)}
              />
            ) : (
              splits && (
                <span className="claim-row-units">
                  {getMessage('claim_row_units', { units: claim.units ?? 1 })}
                </span>
              )
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
          {getMessage('claim_see_more', { count: remaining })}
        </Button>
      )}
    </div>
  );
}
