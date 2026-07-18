import { expect, test } from '@playwright/test';
import { firstClaimableSingleItem } from '../test/helpers/e2e/utils';

// ItemActions matrix spot-check, guest project: a logged-out viewer's
// claimable item keeps Add Claim as the primary top slot and never renders
// Buy & Claim (guest one-click is out of scope for item-actions' current
// form). Read-only — no claims are recorded, so sharing
// dev-list-grace-birthday with guest-claim.guest.spec is safe.
test('GuestClaimable_AddClaimPrimary_NoBuyClaim', async ({ page }) => {
  await page.goto('/lists/dev-list-grace-birthday');
  await expect(
    page.getByRole('heading', { name: "Grace's Birthday" }).first()
  ).toBeVisible();

  const item = firstClaimableSingleItem(page);
  await expect(item.getByRole('button', { name: 'Add Claim' })).toHaveClass(
    /primary/
  );
  await expect(
    page.getByRole('link', { name: 'Buy & Claim — opens in new tab' })
  ).toHaveCount(0);
});
