'use client';

import { SegmentedControl } from '@/app/ui/components/segmented-control/SegmentedControl';
import { SegmentedOption } from '@/app/ui/components/segmented-control/SegmentedOption';
import type { OptionType } from '@/lib/types';
import type { ItemActions } from '../useItemActions';
import type { ItemViewModel } from '../viewModel';

interface ListsQtySheetProps {
  item: ItemViewModel;
  actions: ItemActions;
  listOptions: OptionType[];
}

export function ListsQtySheet({
  item,
  actions,
  listOptions,
}: ListsQtySheetProps) {
  const selected = new Set(item.lists.map((l) => l.value));
  const mode: 'limit' | 'unlimited' = item.qty === null ? 'unlimited' : 'limit';
  const limit = item.qty ?? 1;

  const toggle = (opt: OptionType) =>
    actions.setLists(
      selected.has(opt.value)
        ? item.lists.filter((l) => l.value !== opt.value)
        : [...item.lists, opt]
    );

  return (
    <div className="deck-lists">
      <fieldset className="deck-lists-group">
        <legend className="deck-lists-legend">Lists</legend>
        {listOptions.length === 0 ? (
          <p className="deck-lists-empty">You don&apos;t have any lists yet.</p>
        ) : (
          listOptions.map((opt) => {
            const on = selected.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                role="checkbox"
                aria-checked={on}
                className={`deck-list-opt${on ? ' deck-list-opt-on' : ''}`}
                onClick={() => toggle(opt)}
              >
                {opt.label}
              </button>
            );
          })
        )}
      </fieldset>

      <div className="deck-qty">
        <span className="deck-qty-label" id="deck-qty-mode">
          Quantity
        </span>
        <SegmentedControl
          tone="light"
          value={mode}
          onChange={(m) => actions.setQty(m === 'unlimited' ? null : 1)}
          aria-labelledby="deck-qty-mode"
        >
          <SegmentedOption value="limit">Limit</SegmentedOption>
          <SegmentedOption value="unlimited">Unlimited</SegmentedOption>
        </SegmentedControl>

        {mode === 'limit' && (
          <div className="deck-stepper">
            <button
              type="button"
              className="deck-stepper-btn"
              onClick={() => actions.setQty(Math.max(1, limit - 1))}
              disabled={limit <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="deck-stepper-value" aria-live="polite">
              {limit}
            </span>
            <button
              type="button"
              className="deck-stepper-btn"
              onClick={() => actions.setQty(limit + 1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
