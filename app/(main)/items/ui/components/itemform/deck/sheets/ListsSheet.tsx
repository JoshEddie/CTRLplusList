'use client';

import type { OptionType } from '@/lib/types';
import type { ItemActions } from '../useItemActions';
import type { ItemViewModel } from '../viewModel';

interface ListsSheetProps {
  item: ItemViewModel;
  actions: ItemActions;
  listOptions: OptionType[];
}

export function ListsSheet({ item, actions, listOptions }: ListsSheetProps) {
  const selected = new Set(item.lists.map((l) => l.value));

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
    </div>
  );
}
