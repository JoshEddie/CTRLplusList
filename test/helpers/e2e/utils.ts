import type { Locator, Page } from '@playwright/test';

// Locates the first item card a non-owner viewer can freshly claim on the
// current list page. The card:
//   - exposes an enabled "Get this gift" affordance (so it is not already
//     fully claimed), and
//   - is a single-claim item — no claim counter is rendered (`quantity_limit`
//     of 1), so claiming it fully claims the item and surfaces the claimer's
//     name ("Claimed by …" for a guest, "You claimed this" for the viewer),
//     and
//   - the viewer has not already claimed it ("You claimed this" absent), so a
//     fresh claim is always accepted.
//
// The `.item-container` / `.claim-counter` class hooks select the FIXTURE; the
// specs' assertions target user-visible text, per the suite's "drive real
// affordances" rule.
export function firstClaimableSingleItem(page: Page): Locator {
  return page
    .locator('.item-container')
    .filter({ has: page.getByRole('button', { name: 'Get this gift' }) })
    .filter({ hasNot: page.locator('.claim-counter') })
    .filter({ hasNotText: 'You claimed this' })
    .first();
}

// Waits until the service worker registered by the current page is active AND
// controlling it, returning the registration scope. `app/sw.ts` sets
// `clientsClaim`, so the first visit is claimed without a reload; both waits
// are observable conditions, never sleeps.
export async function awaitServiceWorkerActive(page: Page): Promise<string> {
  const scope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.scope;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  return scope;
}
