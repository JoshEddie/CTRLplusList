import { withSpoilerParam } from '@/lib/spoilers';
import type { SpoilerTier } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// Shared navigation wrapper around `withSpoilerParam` for the three tier
// controls (hero tile, kebab twin, library toggle).
//
// `scroll: false` matters: without it Next scrolls to top
export function useApplySpoilerTier(
  tier: SpoilerTier,
  baseline: SpoilerTier
): (next: SpoilerTier) => void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (next: SpoilerTier) => {
    if (next === tier) return;
    const queryString = withSpoilerParam(
      searchParams?.toString() || '',
      next,
      baseline
    );
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };
}
