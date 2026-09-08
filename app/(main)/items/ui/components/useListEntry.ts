'use client';

import {
  removeListItem,
  setListItemQuantity,
  updatePriority,
} from '@/lib/data/listItems.actions';
import { type ActionResponse } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import toast from 'react-hot-toast';

// The owner's live entry writes on the list's own surface: mirror the number,
// await the action, revert and toast on failure.
//
// Every write carries an absolute quantity rather than a delta, so a press is
// never dropped for arriving while another is in flight — the ticket is what
// keeps a slow refusal from reverting a number the owner has since moved past,
// and typing a two-digit quantity fires a write per keystroke without the
// second one landing on a stale mirror.
//
// A write that changed the entry's membership deliberately skips the refresh.
// Re-reading would take the card out from under the owner still standing on
// it, and 0 has to be a state they can step back out of with the control that
// put them there. `onPresence` is how the surface hears about that instead: the
// move rows target a neighbour by id, so a card stepped to 0 has to stop
// counting as one of the list's ends.
export function useListEntry(
  listId: string,
  itemId: string,
  savedQuantity: number,
  onPresence?: (itemId: string, onList: boolean) => void
) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(savedQuantity);
  const [, startTransition] = useTransition();
  const latest = useRef(0);

  const write = (next: number, run: () => Promise<ActionResponse>) => {
    const previous = quantity;
    const ticket = ++latest.current;
    setQuantity(next);
    onPresence?.(itemId, next > 0);
    startTransition(async () => {
      const result = await run();
      if (ticket !== latest.current) return;
      if (!result.success) {
        setQuantity(previous);
        onPresence?.(itemId, previous > 0);
        toast.error(result.message);
        return;
      }
      if (previous > 0 && next > 0) router.refresh();
    });
  };

  return {
    quantity,
    setQuantity: (next: number) =>
      write(next, () =>
        next === 0
          ? removeListItem(listId, itemId)
          : setListItemQuantity(listId, itemId, next)
      ),
    remove: () => write(0, () => removeListItem(listId, itemId)),
    moveTo: (targetId: string) =>
      write(quantity, () => updatePriority(itemId, targetId, listId)),
  };
}
