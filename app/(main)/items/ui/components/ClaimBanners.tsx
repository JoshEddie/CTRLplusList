import ProgressDisc from '@/app/ui/components/ProgressDisc';
import { getMessage } from '@/lib/i18n/utils';
import type { PurchaseView } from '@/lib/types';
import Facepile from './Facepile';

// The entry's claim progress, on every card that has an entry — or the same
// pair totalled across every list, on the library card, which has none. Below
// the `claims` tier the count is withheld, so the ask is all the banner may
// state and the empty disc is the only fill that discloses nothing.
export default function ClaimBanners({
  claimed,
  quantity,
  withheld,
  lists,
  claims,
  onOpenRoster,
}: {
  claimed: number;
  quantity: number;
  withheld: boolean;
  /** How many lists the numbers span, said only where they are a total. */
  lists?: number;
  /** The entry's projected claims, which the facepile pictures. */
  claims: PurchaseView[];
  /** Opens the roster. Absent wherever the card offers no interaction at all. */
  onOpenRoster?: () => void;
}) {
  // The banner opens exactly where it has claims it may name: an entry that
  // carries at least one, at a tier that discloses them. The library card
  // totals across every list, so its numbers name no single roster. The branch
  // is the one the count already takes (ADR-0015) — nothing hidden decides it.
  const opens =
    !!onOpenRoster && !withheld && lists === undefined && claims.length > 0;

  const readout = (
    <>
      <ProgressDisc value={withheld ? 0 : claimed / quantity} />
      <span className="purchased-banner-text">
        {withheld
          ? getMessage('entry_quantity_wanted', { quantity })
          : getMessage('claim_counter', { claimed, quantity })}
        {lists !== undefined &&
          ` ${getMessage('claim_counter_across', { lists })}`}
      </span>
    </>
  );

  if (!opens) {
    return (
      <div className="purchased-banner purchased-banner--spoiler" role="status">
        {readout}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="purchased-banner purchased-banner--spoiler purchased-banner--opens"
      aria-haspopup="dialog"
      onClick={onOpenRoster}
    >
      {readout}
      <Facepile claims={claims} />
    </button>
  );
}
