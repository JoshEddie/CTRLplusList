import { withSpoilerParam } from '@/lib/spoilers';
import type { SpoilerTier } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// The write half of the spoiler param. `withSpoilerParam` is the pure rule
// every control shares; this is the navigation around it, which was identical
// at all three of them — the hero's Spoilers tile, its collapsed-strip kebab
// twin, and the library toggle.
//
// `scroll: false` is the load-bearing part. Next returns a push or replace to
// the top of the page unless told otherwise, and the hero reads arriving at
// the pin as a reason to spring back open — so a reader changing tier far down
// a list would lose both their place and the collapsed hero.
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
