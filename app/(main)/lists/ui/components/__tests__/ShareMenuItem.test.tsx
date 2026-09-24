/* eslint-disable testing-library/no-node-access --
 * The Share menu item exposes its icon as an `aria-hidden` `<svg>` with no
 * accessible name, so a tag query is the only path to it.
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ShareMenuItem from '../ShareMenuItem';
import { makeList, renderInMenu } from './test-helpers';

afterEach(() => {
  delete (navigator as { share?: unknown }).share;
});

describe('ShareMenuItem', () => {
  const shareItem = () => screen.getByRole('menuitem', { name: 'Share List' });

  it('Default_RendersShareListLabel-IconSvg', () => {
    renderInMenu(<ShareMenuItem list={makeList()} />);
    expect(shareItem().querySelector('svg')).not.toBeNull();
  });

  it('Click_SharesTheCanonicalListUrl', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    });
    renderInMenu(<ShareMenuItem list={makeList()} />);
    await userEvent.click(shareItem());
    expect(share).toHaveBeenCalledWith({
      title: 'Birthday Wishlist',
      url: 'https://www.ctrlpluslist.com/lists/list-1',
    });
  });
});
