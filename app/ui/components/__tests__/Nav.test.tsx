/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * Nav's contract is the `<nav class="nav-container">` containing exactly three
 * `<a class="btn on-dark">` LinkButton-rendered anchors with specific hrefs,
 * icons, and label spans. Role queries reach the anchors but not the unnamed
 * `<nav>` container or its class; classed descendant queries are required.
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import Nav from '../Nav';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/link', async () => ({
  default: (await import('./test-helpers')).MockNextLink,
}));

const fixtureSession = {
  user: { name: 'Test User', image: null, email: 't@example.com' },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

describe('Nav', () => {
  describe('AuthBranches', () => {
    beforeEach(() => {
      vi.mocked(auth).mockReset();
    });

    it('AuthReturnsNull_RendersNull', async () => {
      vi.mocked(auth).mockResolvedValue(
        null as unknown as Awaited<ReturnType<typeof auth>>
      );
      const tree = await Nav();
      const { container } = render(<>{tree}</>);
      expect(container.querySelector('nav.nav-container')).toBeNull();
      expect(screen.queryByRole('navigation')).toBeNull();
    });

    it('AuthReturnsSessionWithoutUser_RendersNull', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: undefined,
        expires: fixtureSession.expires,
      } as unknown as Awaited<ReturnType<typeof auth>>);
      const tree = await Nav();
      const { container } = render(<>{tree}</>);
      expect(container.querySelector('nav.nav-container')).toBeNull();
    });

    it('AuthReturnsSessionWithUser_RendersNavContainer', async () => {
      vi.mocked(auth).mockResolvedValue(
        fixtureSession as unknown as Awaited<ReturnType<typeof auth>>
      );
      const tree = await Nav();
      const { container } = render(<>{tree}</>);
      expect(container.querySelector('nav.nav-container')).not.toBeNull();
    });
  });

  describe('NavItems', () => {
    beforeEach(async () => {
      vi.mocked(auth).mockResolvedValue(
        fixtureSession as unknown as Awaited<ReturnType<typeof auth>>
      );
    });

    it('Authed_RendersThreeLinkButtons', async () => {
      const tree = await Nav();
      const { container } = render(<>{tree}</>);
      const navEl = container.querySelector('nav.nav-container')!;
      expect(navEl.querySelectorAll('a')).toHaveLength(3);
    });

    it('Authed_FirstLinkButtonIsLists_WithReceiptIcon_AndLabel', async () => {
      const tree = await Nav();
      const { container } = render(<>{tree}</>);
      const navEl = container.querySelector('nav.nav-container')!;
      const first = navEl.children[0] as HTMLAnchorElement;
      expect(first.tagName).toBe('A');
      expect(first).toHaveAttribute('href', '/lists');
      expect(first.querySelector('svg')).not.toBeNull();
      const label = first.querySelector('span.label.nav-hide');
      expect(label).not.toBeNull();
      expect(label!.textContent).toBe('Lists');
    });

    it('Authed_SecondLinkButtonIsItems_WithBoxIcon_AndLabel', async () => {
      const tree = await Nav();
      const { container } = render(<>{tree}</>);
      const second = container
        .querySelector('nav.nav-container')!
        .children[1] as HTMLAnchorElement;
      expect(second).toHaveAttribute('href', '/items');
      expect(second.querySelector('svg')).not.toBeNull();
      expect(second.querySelector('span.label.nav-hide')!.textContent).toBe(
        'Items'
      );
    });

    it('Authed_ThirdLinkButtonIsPurchased_WithBagIcon_AndLabel', async () => {
      const tree = await Nav();
      const { container } = render(<>{tree}</>);
      const third = container
        .querySelector('nav.nav-container')!
        .children[2] as HTMLAnchorElement;
      expect(third).toHaveAttribute('href', '/purchased');
      expect(third.querySelector('svg')).not.toBeNull();
      expect(third.querySelector('span.label.nav-hide')!.textContent).toBe(
        'Purchased'
      );
    });

    it('Authed_EachLinkButtonHasOnDarkVariantClass', async () => {
      const tree = await Nav();
      const { container } = render(<>{tree}</>);
      const anchors = container.querySelectorAll('nav.nav-container a');
      expect(anchors).toHaveLength(3);
      anchors.forEach((a) => {
        expect(a).toHaveClass('btn', 'on-dark');
      });
    });

    it('Authed_LabelSpansHaveNavHideClass', async () => {
      const tree = await Nav();
      const { container } = render(<>{tree}</>);
      const labels = container.querySelectorAll(
        'nav.nav-container span.label.nav-hide'
      );
      expect(labels).toHaveLength(3);
    });
  });
});
