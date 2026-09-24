import { getMessage } from '@/lib/i18n/utils';

// What a confirmed claim-affordance reveal discloses, and no more: that the
// item carries claims and what capacity remains. Fetched rather than carried by
// the page, whose payload withholds both at this level.
// Both numbers are units, never a unit count beside a person count: "2 claimed
// · 1 left" has to be readable as two halves of one capacity.
export default function RevealSummary({
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
