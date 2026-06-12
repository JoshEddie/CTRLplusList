import { expect, test } from '@playwright/test';

// Flow: the social-graph management arc as the seeded viewer — follow/unfollow
// a no-edge user, remove a one-way follower, and block/unblock another one-way
// follower. Pins the `user_follows` and `user_blocks` cache-tag loops through
// the real `'use server'` boundary (followUser / unfollowUser / removeFollower
// / blockUser / unblockUser).
//
// Seed targets (chosen to bound the blast radius):
// - dev-friend-dave has NO follow edge with the viewer in either direction —
//   the follow→unfollow arc ends at seed baseline. No first-follow disclosure
//   dialog fires: the viewer has 6 seeded follows.
// - dev-friend-carol and dev-friend-iris follow the viewer ONE-WAY.
//
// RESIDUE (contained, documented for future spec authors): after this spec,
// carol and iris are no longer followers of the viewer for the remainder of
// the run — Remove severs carol's edge, and Block severs iris's edge before
// inserting the block row (unblock deliberately does not restore it). Only the
// other user could recreate these one-way edges, so they stay severed until
// the next `db:reset:dev`. No other spec asserts followers membership or
// counts (the home Following rail shows followees, not followers), so the
// residue is invisible outside this file — but it does mean this spec itself
// only passes from a freshly seeded DB.

test('Follow_ViewerFollowsThenUnfollowsDave_FollowingPageReflectsEachState', async ({
  page,
}) => {
  await page.goto('/user/dev-friend-dave');
  await page.getByRole('button', { name: 'Follow Dave Example' }).click();
  await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();
  // The button flip above is optimistic; the success toast fires only after
  // the server action commits — wait for it before navigating, or /following
  // can render before the follow row exists.
  await expect(page.getByText('Following Dave Example')).toBeVisible();

  // The follow round-tripped: a fresh server read of /following includes Dave.
  await page.goto('/following');
  await expect(
    page.locator('.user-card-name', { hasText: 'Dave Example' })
  ).toBeVisible();

  // Unfollow — the affordance flips back, and /following drops Dave. A fresh
  // navigation proves the server state, not the optimistic flip.
  await page.goto('/user/dev-friend-dave');
  await page.getByRole('button', { name: 'Following' }).click();
  await expect(
    page.getByRole('button', { name: 'Follow Dave Example' })
  ).toBeVisible();
  // Same optimistic-flip caveat: wait for the post-commit toast.
  await expect(page.getByText('Unfollowed')).toBeVisible();

  await page.goto('/following');
  // Anchor on a seeded followee first so the absence check can't pass against
  // a not-yet-rendered page.
  await expect(
    page.locator('.user-card-name', { hasText: 'Alice Example' })
  ).toBeVisible();
  await expect(
    page.locator('.user-card-name', { hasText: 'Dave Example' })
  ).toHaveCount(0);
});

test('Connections_ViewerRemovesFollowerCarol_RowDisappears', async ({
  page,
}) => {
  await page.goto('/settings/connections');
  const followers = page.locator('section.connections-section').filter({
    has: page.getByRole('heading', { name: /^Followers \(/ }),
  });
  const carolRow = followers
    .locator('li.connections-row')
    .filter({ hasText: 'Carol Example' });
  await expect(carolRow).toBeVisible();

  await carolRow.getByRole('button', { name: 'Remove' }).click();
  await expect(carolRow).toHaveCount(0);
  // The section still renders its remaining followers — the row vanished
  // because the edge was severed, not because the section crashed.
  await expect(
    followers.locator('li.connections-row').filter({ hasText: 'Alice Example' })
  ).toBeVisible();
});

test('Connections_ViewerBlocksThenUnblocksIris_FollowerEdgeStaysSevered', async ({
  page,
}) => {
  await page.goto('/settings/connections');
  const followers = page.locator('section.connections-section').filter({
    has: page.getByRole('heading', { name: /^Followers \(/ }),
  });
  const blocked = page.locator('section.connections-section').filter({
    has: page.getByRole('heading', { name: /^Blocked \(/ }),
  });
  const irisFollowerRow = followers
    .locator('li.connections-row')
    .filter({ hasText: 'Iris Example' });
  const irisBlockedRow = blocked
    .locator('li.connections-row')
    .filter({ hasText: 'Iris Example' });

  // Block — only reachable from her Followers row; it severs the follow edge
  // before inserting the block row.
  await irisFollowerRow.getByRole('button', { name: 'Block' }).click();
  await expect(irisBlockedRow).toBeVisible();
  await expect(irisFollowerRow).toHaveCount(0);

  // Unblock — she leaves Blocked but stays out of Followers: severance is not
  // undone, which is the contract worth pinning.
  await irisBlockedRow.getByRole('button', { name: 'Unblock' }).click();
  await expect(blocked.getByText('No blocked users.')).toBeVisible();
  await expect(irisFollowerRow).toHaveCount(0);
  await expect(
    followers.locator('li.connections-row').filter({ hasText: 'Bob Example' })
  ).toBeVisible();
});
