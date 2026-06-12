'use client';

import { Button } from '@/app/ui/components/button';
import { TextField } from '@/app/ui/components/field';
import {
  getClaimPickerForItem,
  signInUser,
  type ClaimPicker,
} from '@/lib/data/user.actions';
import { ItemDisplay, PurchaseView } from '@/lib/types';
import { useCallback, useEffect, useState } from 'react';
import { claimLabel, firstToken } from '../utils';
import ClaimDisclosure, {
  type AttributedTarget,
  type PickerStatus,
} from './ClaimDisclosure';
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

function OwnerClaimsList({
  claims,
  onRemoveClaim,
}: {
  claims: PurchaseView[];
  onRemoveClaim: (claim: PurchaseView) => void;
}) {
  if (claims.length === 0) return null;
  return (
    <ul className="owner-claims-list">
      {claims.map((claim) => (
        <li key={claim.id} className="owner-claim-row">
          <span>{claimLabel(claim)}</span>
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
        </li>
      ))}
    </ul>
  );
}

export default function PurchaseFlowContainer({
  user_id,
  isOwner,
  showSpoilers,
  ownerCanClaim,
  ownerClaims,
  item,
  onSelfClaim,
  onAttributedClaim,
  onGuestClaim,
  onRemoveClaim,
}: {
  user_id?: string | null;
  isOwner: boolean;
  showSpoilers: boolean;
  ownerCanClaim: boolean;
  ownerClaims: PurchaseView[];
  item: ItemDisplay;
  onSelfClaim: () => void;
  onAttributedClaim: (target: AttributedTarget) => void;
  onGuestClaim: (name: string) => void;
  onRemoveClaim: (claim: PurchaseView) => void;
}) {
  const [picker, setPicker] = useState<ClaimPicker | null>(null);
  const [pickerStatus, setPickerStatus] = useState<PickerStatus>('loading');
  const [fetchAttempt, setFetchAttempt] = useState(0);

  // Spoilers-off owners get no claim UI and consume no claim data.
  const showClaimSection = !!user_id && (!isOwner || showSpoilers);
  const itemId = item.id;

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
      <ModalStoreRow stores={item.stores} />

      {!user_id ? (
        <GuestClaimSection onGuestClaim={onGuestClaim} />
      ) : !showClaimSection ? (
        <p className="owner-list-label">Your list</p>
      ) : (
        <>
          {isOwner && (
            <OwnerClaimsList
              claims={ownerClaims}
              onRemoveClaim={onRemoveClaim}
            />
          )}
          {(!isOwner || ownerCanClaim) && (
            <>
              <Button
                variant="primary"
                className="claim-self-cta"
                onClick={onSelfClaim}
              >
                {isOwner ? 'I bought this myself' : 'Claim this gift'}
              </Button>
              <ClaimDisclosure
                label={
                  isOwner
                    ? 'Claiming for someone?'
                    : 'Claiming for someone else?'
                }
                circleLabel={circleLabel}
                status={pickerStatus}
                pool={picker?.pool ?? []}
                onRetry={retry}
                onAttributedClaim={onAttributedClaim}
                onGuestClaim={onGuestClaim}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
