'use client';

import { claimSummaryForEntry } from '@/lib/data/purchase.actions';
import {
  getClaimPickerForItem,
  type ClaimPicker,
} from '@/lib/data/user.actions';
import { getMessage } from '@/lib/i18n/utils';
import { atLeast } from '@/lib/spoilers';
import {
  EntryCapacity,
  ItemDisplay,
  ProfileMembershipView,
  PurchaseView,
  SpoilerTier,
} from '@/lib/types';
import { useCallback, useEffect, useState } from 'react';
import { firstToken, unitsClaimedLabel } from '../utils';
import AuthedClaimSection from './AuthedClaimSection';
import type { AttributedTarget, PickerStatus } from './ClaimDisclosure';
import ClaimsList from './ClaimsList';
import GuestClaimSection from './GuestClaimSection';
import ModalStoreRow from './ModalStoreRow';
import PurchaseModalHeader from './PurchaseModalHeader';
import RevealSummary from './RevealSummary';
import UnitsField from './UnitsField';

export type { AttributedTarget };

export default function PurchaseFlowContainer({
  actor,
  isOwner,
  tier,
  claims,
  capacity,
  viewerIsPurchaser,
  item,
  onSelfClaim,
  onAttributedClaim,
  onGuestClaim,
  onRemoveClaim,
  onUpdateUnits,
}: {
  actor?: ProfileMembershipView;
  isOwner: boolean;
  tier: SpoilerTier;
  claims: PurchaseView[];
  /** Null off a list, where there is nothing to claim against. */
  capacity: EntryCapacity | null;
  /** The viewer is already the recorded purchaser of one of the item's claims, so the self-claim CTA is suppressed: a purchaser holds one claim per entry and takes more of it by raising that claim's units, not by making a second one. */
  viewerIsPurchaser?: boolean;
  item: ItemDisplay;
  onSelfClaim: (units: number) => void;
  onAttributedClaim: (target: AttributedTarget, units: number) => void;
  onGuestClaim: (name: string, units: number) => void;
  onRemoveClaim: (claim: PurchaseView) => void;
  onUpdateUnits: (claim: PurchaseView, units: number) => void;
}) {
  const [picker, setPicker] = useState<ClaimPicker | null>(null);
  const [unitsValue, setUnitsValue] = useState(1);
  const [pickerStatus, setPickerStatus] = useState<PickerStatus>('loading');
  const [fetchAttempt, setFetchAttempt] = useState(0);
  const [reveal, setReveal] = useState<{
    claimedUnits: number;
    remaining: number;
  } | null>(null);

  // Claim affordances are ungoverned by spoiler state (`claim-attribution`), so
  // every authenticated viewer reaches the flow — the owner included.
  const showClaimSection = !!actor;
  const itemId = item.id;
  const listId = item.list_id;

  // The modal only opens at this level after the viewer confirmed the reveal,
  // so arriving here IS the confirmation. The fetch is scoped to the item and
  // changes nothing the page carries.
  const needsReveal = !atLeast(tier, 'claims');
  useEffect(() => {
    if (!needsReveal || !itemId || !listId) return;
    let cancelled = false;
    claimSummaryForEntry(listId, itemId).then((summary) => {
      if (!cancelled) setReveal(summary);
    });
    return () => {
      cancelled = true;
    };
  }, [itemId, listId, needsReveal]);

  // Nothing left to claim is a refusal the viewer should read before acting,
  // not one the action returns after they try. An absent entry is the same
  // kind of refusal: `?purchaseItem=` can open this modal on the item library,
  // which names no list, and a CTA there would dispatch a write that cannot
  // land.
  const canClaim = !!listId && reveal?.remaining !== 0;

  // Below the `claims` tier the page's payload withholds what is claimed, so
  // its remainder would read as the whole quantity — the confirmed reveal is
  // the only number there, and the control waits for it rather than offering a
  // cap it would then have to take back. One entry asking for one needs no
  // control at all: the overwhelmingly common claim is unchanged.
  const remaining =
    (needsReveal ? reveal?.remaining : capacity?.remaining) ?? 0;
  const quantity = capacity?.quantity ?? 1;
  const showUnits = quantity > 1 && remaining > 1;
  // Before the reveal lands there is no remainder to subtract from, and the
  // readout would state a full house rather than nothing.
  const unitsStatus =
    needsReveal && !reveal ? undefined : unitsClaimedLabel(quantity, remaining);
  const units = showUnits ? Math.min(unitsValue, remaining) : 1;

  // Each (item, attempt) pair is a fresh fetch; reset to loading at render
  // time so the effect body only performs async state updates.
  const fetchKey = `${itemId}:${fetchAttempt}`;
  const [prevFetchKey, setPrevFetchKey] = useState(fetchKey);
  if (fetchKey !== prevFetchKey) {
    setPrevFetchKey(fetchKey);
    setPickerStatus('loading');
  }

  useEffect(() => {
    if (!showClaimSection || !itemId) return;
    let cancelled = false;
    getClaimPickerForItem(itemId)
      .then((data) => {
        if (cancelled) return;
        setPicker(data);
        setPickerStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setPickerStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [itemId, showClaimSection, fetchAttempt]);

  const retry = useCallback(() => setFetchAttempt((n) => n + 1), []);

  const circleLabel = isOwner
    ? getMessage('claim_circle_owner')
    : getMessage('claim_circle_viewer', {
        name: picker?.ownerName
          ? firstToken(picker.ownerName)
          : getMessage('owner_name_placeholder'),
      });

  return (
    <div className="claim-modal">
      <PurchaseModalHeader item={item} />
      <ModalStoreRow store={item.store} />

      {needsReveal && <RevealSummary summary={reveal} />}

      {showClaimSection && isOwner && (
        // Above the control that claims, not between it and the button that
        // does: the owner edits units on a claim somebody else made — a
        // capability beyond master unclaim, gated by the same ownership floor.
        <ClaimsList
          claims={claims}
          canRemove={() => true}
          capacity={capacity}
          unitsStatus={unitsStatus}
          removalDisabled={!actor.role.admin}
          onRemoveClaim={onRemoveClaim}
          onUpdateUnits={onUpdateUnits}
        />
      )}

      {canClaim && showUnits && (
        <UnitsField
          label={getMessage('claim_units_field_label')}
          status={unitsStatus}
          value={units}
          max={remaining}
          onChange={setUnitsValue}
        />
      )}

      {!showClaimSection ? (
        canClaim && (
          <GuestClaimSection
            onGuestClaim={(name) => onGuestClaim(name, units)}
          />
        )
      ) : (
        <AuthedClaimSection
          isOwner={isOwner}
          canClaim={canClaim}
          viewerIsPurchaser={viewerIsPurchaser}
          circleLabel={circleLabel}
          pickerStatus={pickerStatus}
          pool={picker?.pool ?? []}
          onRetry={retry}
          units={units}
          onSelfClaim={() => onSelfClaim(units)}
          onAttributedClaim={(target) => onAttributedClaim(target, units)}
          onGuestClaim={(name) => onGuestClaim(name, units)}
        />
      )}
    </div>
  );
}
