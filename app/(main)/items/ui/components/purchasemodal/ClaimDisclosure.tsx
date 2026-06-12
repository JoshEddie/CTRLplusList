'use client';

import Avatar from '@/app/(main)/users/ui/components/Avatar';
import { Button } from '@/app/ui/components/button';
import { SearchField, TextField } from '@/app/ui/components/field';
import { type ClaimPicker } from '@/lib/data/user.actions';
import { useMemo, useState } from 'react';
import { MdCheck, MdExpandLess, MdExpandMore } from 'react-icons/md';

export type AttributedTarget = { id: string; name: string | null };

export type PickerStatus = 'loading' | 'error' | 'ready';

export default function ClaimDisclosure({
  label,
  circleLabel,
  status,
  pool,
  onRetry,
  onAttributedClaim,
  onGuestClaim,
}: {
  label: string;
  /** e.g. "Alice's circle" or "your circle" — interpolated into picker copy. */
  circleLabel: string;
  status: PickerStatus;
  pool: ClaimPicker['pool'];
  onRetry: () => void;
  onAttributedClaim: (target: AttributedTarget) => void;
  onGuestClaim: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');

  const toggle = () => {
    if (expanded) {
      setQuery('');
      setSelectedId(null);
      setFreeText('');
    }
    setExpanded((e) => !e);
  };

  const filteredPool = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((u) => (u.name ?? '').toLowerCase().includes(q));
  }, [pool, query]);

  const selected = pool.find((u) => u.id === selectedId) ?? null;
  const trimmedFreeText = freeText.trim();
  const confirmName = selected
    ? (selected.name ?? 'Someone')
    : trimmedFreeText || null;

  const selectRow = (id: string) => {
    setFreeText('');
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const typeFreeText = (value: string) => {
    setSelectedId(null);
    setFreeText(value);
  };

  // Only rendered once a target exists, so the no-target case can't fire.
  const confirm = () =>
    selected ? onAttributedClaim(selected) : onGuestClaim(trimmedFreeText);

  return (
    <div className="claim-disclosure">
      <button
        type="button"
        className="claim-disclosure-trigger"
        aria-expanded={expanded}
        onClick={toggle}
      >
        <span className="claim-disclosure-label">{label}</span>
        {status === 'ready' && pool.length > 0 && (
          <span className="claim-disclosure-avatars" aria-hidden>
            {pool.slice(0, 3).map((u) => (
              <Avatar key={u.id} src={u.image} name={u.name} size={24} />
            ))}
          </span>
        )}
        {expanded ? <MdExpandLess aria-hidden /> : <MdExpandMore aria-hidden />}
      </button>

      {expanded && status === 'loading' && (
        <p className="claim-pool-status">Loading {circleLabel}…</p>
      )}

      {expanded && status === 'error' && (
        <div className="claim-pool-error">
          <p className="claim-pool-status">Couldn&apos;t load {circleLabel}</p>
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}

      {expanded && status === 'ready' && (
        <div className="claim-picker">
          {pool.length > 0 && (
            <>
              <SearchField
                placeholder={`Search ${circleLabel}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClear={() => setQuery('')}
                aria-label={`Search ${circleLabel}`}
              />
              <ul className="claim-pool-list">
                {filteredPool.length === 0 ? (
                  <li className="claim-pool-empty">
                    No one by that name — add them below
                  </li>
                ) : (
                  filteredPool.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className={`claim-pool-row${u.id === selectedId ? ' selected' : ''}`}
                        aria-pressed={u.id === selectedId}
                        onClick={() => selectRow(u.id)}
                      >
                        <Avatar src={u.image} name={u.name} size={32} />
                        <span className="claim-pool-name">{u.name}</span>
                        {u.id === selectedId && (
                          <MdCheck className="claim-pool-check" aria-hidden />
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <div className="claim-picker-divider" role="presentation" />
            </>
          )}
          <TextField
            label="Someone not listed?"
            value={freeText}
            onChange={(e) => typeFreeText(e.target.value)}
            placeholder="Enter their name…"
          />
          {confirmName && (
            <Button
              variant="primary"
              className="claim-confirm-btn"
              onClick={confirm}
            >
              Confirm — {confirmName}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
