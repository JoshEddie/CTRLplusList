import {
  EntryCapacity,
  ItemDisplay,
  ProfileMembershipView,
  PurchaseView,
  SpoilerTier,
} from '@/lib/types';
import { claimedStatusLabel, heldByViewer } from '../utils';
import ClaimsList from './ClaimsList';
import PurchaseModalHeader from './PurchaseModalHeader';

// Every claim on one entry, opened from the banner. The tier is the consent —
// nothing is asked here, the owner included — so the sheet's only decision is
// which rows the viewer may act on: the owner acts on all of them under the
// admin floor that governs master unclaim, anyone else on the ones they hold.
export default function ClaimRoster({
  claims,
  capacity,
  actor,
  isOwner,
  tier,
  item,
  onRemoveClaim,
  onUpdateUnits,
}: {
  claims: PurchaseView[];
  /** Null off a list, where there is no entry to have a roster. */
  capacity: EntryCapacity | null;
  actor?: ProfileMembershipView;
  isOwner: boolean;
  tier: SpoilerTier;
  item: ItemDisplay;
  onRemoveClaim: (claim: PurchaseView) => void;
  onUpdateUnits: (claim: PurchaseView, units: number) => void;
}) {
  // The entry's own summed count, never a sum over the rows listed
  // (ADR-0016) — a roster paging ten at a time would otherwise state a total
  // that grows as the viewer reads.
  const claimed = claimedStatusLabel(capacity, tier);
  return (
    <div className="claim-modal">
      <PurchaseModalHeader item={item} />
      {claimed && (
        <p className="claim-roster-count" role="status">
          {claimed}
        </p>
      )}
      <ClaimsList
        claims={claims}
        canRemove={isOwner ? () => true : heldByViewer}
        capacity={capacity}
        unitsStatus={claimed}
        removalDisabled={isOwner && !actor?.role.admin}
        onRemoveClaim={onRemoveClaim}
        onUpdateUnits={onUpdateUnits}
      />
    </div>
  );
}
