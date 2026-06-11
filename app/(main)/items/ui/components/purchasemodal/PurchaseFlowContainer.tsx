'use client';

import SignInButton from '@/app/(auth)/ui/components/SignInButton';
import Avatar from '@/app/(main)/users/ui/components/Avatar';
import { Button } from '@/app/ui/components/button';
import { SearchField, TextField } from '@/app/ui/components/field';
import { getClaimPickerForItem, type ClaimPicker } from '@/lib/data/user.actions';
import { useEffect, useMemo, useState } from 'react';
import { firstToken } from '../utils';
import ModalButtons from './ModalButtons';
import PurchaseFlow from './PurchaseFlow';

export type AttributedTarget = { id: string; name: string | null };

export default function PurchaseFlowContainer({
  user_id,
  isOwner,
  itemId,
  itemName,
  onSelfClaim,
  onAttributedClaim,
  onGuestClaim,
}: {
  user_id?: string | null;
  isOwner: boolean;
  itemId: string;
  itemName: string;
  onSelfClaim: () => void;
  onAttributedClaim: (target: AttributedTarget) => void;
  onGuestClaim: (name: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [picker, setPicker] = useState<ClaimPicker | null>(null);
  const [pickerLoading, setPickerLoading] = useState(!!user_id);

  useEffect(() => {
    if (!user_id) return;
    let cancelled = false;
    getClaimPickerForItem(itemId).then((data) => {
      if (cancelled) return;
      setPicker(data);
      setPickerLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [itemId, user_id]);

  const filteredPool = useMemo(() => {
    const pool = picker?.pool ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((u) => (u.name ?? '').toLowerCase().includes(q));
  }, [picker, query]);

  if (!user_id) {
    return (
      <PurchaseFlow primary_text="Sign in to track your purchases and save lists!">
        <SignInButton />
        <div className="guest-purchase">
          <p>Or continue as guest:</p>
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
      </PurchaseFlow>
    );
  }

  const circleLabel = isOwner
    ? 'your circle'
    : `${picker?.ownerName ? firstToken(picker.ownerName) : 'the owner'}'s circle`;

  return (
    <div className="claim-modal">
      <header className="claim-modal-header">
        <h2>Claim this gift</h2>
        <p className="claim-modal-subtitle">{itemName}</p>
      </header>

      <Button variant="primary" className="claim-self-cta" onClick={onSelfClaim}>
        {isOwner ? 'I bought this myself' : "I'm getting this"}
      </Button>

      <p className="claim-divider">Claim for someone in {circleLabel}:</p>

      <SearchField
        placeholder={`Search ${circleLabel}…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery('')}
        aria-label={`Search ${circleLabel}`}
      />

      <ul className="claim-pool-list">
        {pickerLoading ? (
          <li className="claim-pool-empty">Loading…</li>
        ) : filteredPool.length === 0 ? (
          <li className="claim-pool-empty">
            No one by that name — add them below
          </li>
        ) : (
          filteredPool.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                className="claim-pool-row"
                onClick={() => onAttributedClaim(u)}
              >
                <Avatar src={u.image} name={u.name} size={32} />
                <span className="claim-pool-name">{u.name}</span>
              </button>
            </li>
          ))
        )}
      </ul>

      {!fallbackOpen ? (
        <button
          type="button"
          className="claim-fallback-toggle"
          onClick={() => setFallbackOpen(true)}
        >
          Someone not listed? Enter their name
        </button>
      ) : (
        <div className="claim-fallback">
          <TextField
            label="Their name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Their name"
            autoFocus
          />
          <ModalButtons
            primary_button_text={`Claim for ${guestName.trim() || '…'}`}
            primary_button_onclick={() =>
              guestName.trim() && onGuestClaim(guestName.trim())
            }
            primary_button_disabled={!guestName.trim()}
            primary_button_disabled_with_tooltip="Please enter a name to continue"
          />
        </div>
      )}
    </div>
  );
}
