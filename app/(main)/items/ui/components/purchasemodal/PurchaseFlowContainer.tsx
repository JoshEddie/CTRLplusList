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
import {
  ProfileMembershipView,
  ItemDisplay,
  PurchaseView,
  SpoilerTier,
} from '@/lib/types';
import { atLeast } from '@/lib/spoilers';
import { useCallback, useEffect, useState } from 'react';
import { firstToken } from '../utils';
import ClaimDisclosure, {
  type AttributedTarget,
  type PickerStatus,
} from './ClaimDisclosure';
import ClaimsList from './ClaimsList';
import ModalButtons from './ModalButtons';
import ModalStoreRow from './ModalStoreRow';
import PurchaseModalHeader from './PurchaseModalHeader';

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
          label="Your name"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Your name"
        />
        <ModalButtons
          primary_button_text="Claim as Guest"
          primary_button_onclick={() =>
            guestName.trim() && onGuestClaim(guestName.trim())
          }
          primary_button_disabled={!guestName.trim()}
          primary_button_disabled_with_tooltip="Please enter a name to continue"
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
        ? 'No claims on this item yet.'
        : summary.remaining === 0
          ? 'Fully claimed'
          : `${summary.claimedUnits} claimed · ${summary.remaining} left`}
    </p>
  );
}

function AuthedClaimSection({
  isOwner,
  canClaim,
  claims,
  masterUnclaimDisabled,
  viewerIsPurchaser,
  circleLabel,
  pickerStatus,
  pool,
  onRetry,
  onSelfClaim,
  onAttributedClaim,
  onGuestClaim,
  onRemoveClaim,
}: {
  isOwner: boolean;
  canClaim: boolean;
  claims: PurchaseView[];
  masterUnclaimDisabled: boolean;
  viewerIsPurchaser?: boolean;
  circleLabel: string;
  pickerStatus: PickerStatus;
  pool: ClaimPicker['pool'];
  onRetry: () => void;
  onSelfClaim: () => void;
  onAttributedClaim: (target: AttributedTarget) => void;
  onGuestClaim: (name: string) => void;
  onRemoveClaim: (claim: PurchaseView) => void;
}) {
  return (
    <>
      {isOwner && (
        <ClaimsList
          claims={claims}
          canRemove={() => true}
          removalDisabled={masterUnclaimDisabled}
          onRemoveClaim={onRemoveClaim}
        />
      )}
      {canClaim && (
        <>
          {(isOwner || !viewerIsPurchaser) && (
            <Button
              variant="primary"
              className="claim-self-cta"
              onClick={onSelfClaim}
            >
              {isOwner ? 'I bought this myself' : 'Claim this gift'}
            </Button>
          )}
          <ClaimDisclosure
            label={
              isOwner ? 'Claiming for someone?' : 'Claiming for someone else?'
            }
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
  viewerIsPurchaser,
  item,
  onSelfClaim,
  onAttributedClaim,
  onGuestClaim,
  onRemoveClaim,
}: {
  actor?: ProfileMembershipView;
  isOwner: boolean;
  tier: SpoilerTier;
  claims: PurchaseView[];
  /** The viewer is already the recorded purchaser of one of the item's claims; a second self-claim is unsupported, so the self-claim CTA is suppressed. */
  // TODO(#230): allow a second self-claim.
  viewerIsPurchaser?: boolean;
  item: ItemDisplay;
  onSelfClaim: () => void;
  onAttributedClaim: (target: AttributedTarget) => void;
  onGuestClaim: (name: string) => void;
  onRemoveClaim: (claim: PurchaseView) => void;
}) {
  const [picker, setPicker] = useState<ClaimPicker | null>(null);
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
    ? 'your circle'
    : `${picker?.ownerName ? firstToken(picker.ownerName) : 'the owner'}'s circle`;

  return (
    <div className="claim-modal">
      <PurchaseModalHeader item={item} />
      <ModalStoreRow store={item.store} />

      {needsReveal && <RevealSummary summary={reveal} />}

      {!showClaimSection ? (
        canClaim && <GuestClaimSection onGuestClaim={onGuestClaim} />
      ) : (
        <AuthedClaimSection
          isOwner={isOwner}
          canClaim={canClaim}
          claims={claims}
          masterUnclaimDisabled={!actor.role.admin}
          viewerIsPurchaser={viewerIsPurchaser}
          circleLabel={circleLabel}
          pickerStatus={pickerStatus}
          pool={picker?.pool ?? []}
          onRetry={retry}
          onSelfClaim={onSelfClaim}
          onAttributedClaim={onAttributedClaim}
          onGuestClaim={onGuestClaim}
          onRemoveClaim={onRemoveClaim}
        />
      )}
    </div>
  );
}
