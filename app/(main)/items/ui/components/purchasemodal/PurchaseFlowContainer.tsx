'use client';

// TODO(#343): split the extra components into their own files, then drop this disable
/* eslint-disable react/no-multi-comp */

import { Button } from '@/app/ui/components/button';
import { TextField } from '@/app/ui/components/field';
import { claimSummaryForEntry } from '@/lib/data/purchase.actions';
import {
  getClaimPickerForItem,
  signInUser,
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
import ClaimDisclosure, {
  type AttributedTarget,
  type PickerStatus,
} from './ClaimDisclosure';
import ClaimsList from './ClaimsList';
import ModalButtons from './ModalButtons';
import ModalStoreRow from './ModalStoreRow';
import PurchaseModalHeader from './PurchaseModalHeader';
import UnitsField from './UnitsField';

export type { AttributedTarget };

function GuestClaimSection({
  onGuestClaim,
}: {
  onGuestClaim: (name: string) => void;
}) {
  const [guestName, setGuestName] = useState('');
  return (
    <>
      <div className="guest-purchase">
        <TextField
          label={getMessage('claim_guest_name_label')}
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder={getMessage('claim_guest_name_label')}
        />
        <ModalButtons
          primary_button_text={getMessage('claim_as_guest_label')}
          primary_button_onclick={() =>
            guestName.trim() && onGuestClaim(guestName.trim())
          }
          primary_button_disabled={!guestName.trim()}
          primary_button_disabled_with_tooltip={getMessage(
            'claim_guest_name_required'
          )}
        />
      </div>
      <form action={signInUser} className="guest-signin-footer">
        Have an account?{' '}
        <Button variant="link" type="submit">
          Sign in
        </Button>{' '}
        to claim with your profile.
      </form>
    </>
  );
}

// What a confirmed claim-affordance reveal discloses, and no more: that the
// item carries claims and what capacity remains. Fetched rather than carried by
// the page, whose payload withholds both at this level.
// Both numbers are units, never a unit count beside a person count: "2 claimed
// · 1 left" has to be readable as two halves of one capacity.
function RevealSummary({
  summary,
}: {
  summary: { claimedUnits: number; remaining: number } | null;
}) {
  if (!summary) return null;
  return (
    <p className="claim-reveal-summary" role="status">
      {summary.claimedUnits === 0
        ? getMessage('claim_reveal_none')
        : summary.remaining === 0
          ? getMessage('claim_fully_claimed')
          : getMessage('claim_reveal_units', {
              claimed: summary.claimedUnits,
              remaining: summary.remaining,
            })}
    </p>
  );
}

// Four sentences, not one with two holes: "I bought 3 of these myself" and
// "Claim 3 of these" are different sentences, and each drops its number below
// two rather than reading "Claim 1 of these".
function claimCtaLabel(isOwner: boolean, units: number): string {
  if (units > 1) {
    return getMessage(isOwner ? 'claim_cta_owner_units' : 'claim_cta_viewer_units', {
      units,
    });
  }
  return getMessage(isOwner ? 'claim_cta_owner' : 'claim_cta_viewer');
}

function AuthedClaimSection({
  isOwner,
  canClaim,
  viewerIsPurchaser,
  circleLabel,
  pickerStatus,
  pool,
  units,
  onRetry,
  onSelfClaim,
  onAttributedClaim,
  onGuestClaim,
}: {
  isOwner: boolean;
  canClaim: boolean;
  viewerIsPurchaser?: boolean;
  circleLabel: string;
  pickerStatus: PickerStatus;
  pool: ClaimPicker['pool'];
  /** How many units the CTA would claim, so the button states the ask rather than leaving it to the control above it. */
  units: number;
  onRetry: () => void;
  onSelfClaim: () => void;
  onAttributedClaim: (target: AttributedTarget) => void;
  onGuestClaim: (name: string) => void;
}) {
  return (
    <>
      {canClaim && (
        <>
          {(isOwner || !viewerIsPurchaser) && (
            <Button
              variant="primary"
              className="claim-self-cta"
              onClick={onSelfClaim}
            >
              {claimCtaLabel(isOwner, units)}
            </Button>
          )}
          <ClaimDisclosure
            label={getMessage(
              isOwner
                ? 'claim_disclosure_label_owner'
                : 'claim_disclosure_label_viewer'
            )}
            circleLabel={circleLabel}
            status={pickerStatus}
            pool={pool}
            onRetry={onRetry}
            onAttributedClaim={onAttributedClaim}
            onGuestClaim={onGuestClaim}
          />
        </>
      )}
    </>
  );
}

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
