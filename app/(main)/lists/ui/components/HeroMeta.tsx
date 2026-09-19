import { getMessage } from '@/lib/i18n/utils';
import { atLeast } from '@/lib/spoilers';
import { timeAgo } from '@/lib/timeAgo';
import type { SpoilerTier } from '@/lib/types';
import ClaimProgress from './ClaimProgress';

export default function HeroMeta({
  tier,
  claimedCount,
  itemCount,
  updatedAt,
}: {
  tier: SpoilerTier;
  claimedCount?: number;
  itemCount: number;
  updatedAt: Date;
}) {
  const showProgress = atLeast(tier, 'progress') && claimedCount !== undefined;
  const label = showProgress
    ? getMessage('hero_meta_claimed_count', {
        claimed: claimedCount,
        total: itemCount,
      })
    : getMessage('hero_meta_item_count', { count: itemCount });
  const when = timeAgo(updatedAt);

  return (
    <div className="list-hero-meta">
      {showProgress && (
        <ClaimProgress claimed={claimedCount} total={itemCount} />
      )}
      <span className="list-hero-meta-label">
        {label}
        {when && ` ${getMessage('hero_meta_updated', { when })}`}
      </span>
    </div>
  );
}
