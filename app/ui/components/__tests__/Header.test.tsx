/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * Header's contract is the exact class string composed onto the outer div
 * (`'header'` or `'header <extra>'`) and the inner `.pageTitleContainer`,
 * `.pageTitle`, `.header-buttons` structure. No role query reaches those
 * unnamed divs; classed descendant queries are the only path.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Header from '../Header';

describe('Header', () => {
  describe('DomShape', () => {
    it('TitleOnly_RendersHeaderClassWithoutUndefinedToken', () => {
      const { container } = render(<Header title="My Lists" />);
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).toBe('header');
    });

    it('TitleAndClassName_RendersHeaderWithExtraClass', () => {
      const { container } = render(
        <Header title="My Lists" className="extra-class" />
      );
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).toBe('header extra-class');
    });

    it('Title_RendersInsidePageTitle', () => {
      const { container } = render(<Header title="My Lists" />);
      const titleContainer = container.querySelector('.pageTitleContainer');
      expect(titleContainer).not.toBeNull();
      const title = titleContainer!.querySelector('.pageTitle');
      expect(title).not.toBeNull();
      expect(title!.textContent).toBe('My Lists');
    });

    it('Children_RenderInsideHeaderButtons', () => {
      const { container } = render(
        <Header title="t">
          <button type="button">Click me</button>
        </Header>
      );
      const buttons = container.querySelector('.header-buttons');
      expect(buttons).not.toBeNull();
      expect(buttons!.querySelectorAll('button')).toHaveLength(1);
      expect(buttons!.firstElementChild!.textContent).toBe('Click me');
    });

    it('MultipleChildren_AllInsideHeaderButtons', () => {
      const { container } = render(
        <Header title="t">
          <button type="button">A</button>
          <button type="button">B</button>
        </Header>
      );
      const buttons = container.querySelector('.header-buttons');
      expect(buttons!.children).toHaveLength(2);
      expect(buttons!.children[0].textContent).toBe('A');
      expect(buttons!.children[1].textContent).toBe('B');
    });

    it('NoChildren_HeaderButtonsRendersEmpty', () => {
      const { container } = render(<Header title="t" />);
      const buttons = container.querySelector('.header-buttons');
      expect(buttons).not.toBeNull();
      expect(buttons!.children).toHaveLength(0);
    });
  });
});
