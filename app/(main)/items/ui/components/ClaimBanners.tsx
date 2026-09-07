import ProgressDisc from '@/app/ui/components/ProgressDisc';
import { getMessage } from '@/lib/i18n/utils';

// The entry's claim progress, on every card that has an entry — or the same
// pair totalled across every list, on the library card, which has none. Below
// the `claims` tier the count is withheld, so the ask is all the banner may
// state and the empty disc is the only fill that discloses nothing.
export default function ClaimBanners({
  claimed,
  quantity,
  withheld,
  lists,
}: {
  claimed: number;
  quantity: number;
  withheld: boolean;
  /** How many lists the numbers span, said only where they are a total. */
  lists?: number;
}) {
  return (
    <div className="purchased-banner purchased-banner--spoiler" role="status">
      <ProgressDisc value={withheld ? 0 : claimed / quantity} />
      <span>
        {withheld
          ? getMessage('entry_quantity_wanted', { quantity })
          : getMessage('claim_counter', { claimed, quantity })}
        {lists !== undefined &&
          ` ${getMessage('claim_counter_across', { lists })}`}
      </span>
    </div>
  );
}
