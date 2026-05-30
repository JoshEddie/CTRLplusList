/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * MenuItemRadio renders structural spans (icon, label, description, indicator)
 * that carry no role and no accessible name (icon and indicator are
 * `aria-hidden`; label/description are presentational text containers). The
 * slot-presence contract — "indicator span is ALWAYS rendered, with text
 * content '✓' or empty depending on `checked`" — is asserted via class-based
 * querySelector since no role/text query can locate the empty-content span.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import type { MouseEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MenuItemRadio } from '../MenuItemRadio';

const noopSelect = () => {};

describe('MenuItemRadio', () => {
  describe('DomShape', () => {
    it('Default_RendersButtonWithRoleMenuitemradio', () => {
      render(<MenuItemRadio checked={false} onSelect={noopSelect}>X</MenuItemRadio>);
      const button = screen.getByRole('menuitemradio');
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('aria-checked', 'false');
      expect(button).toHaveAttribute('class', 'menu-item menu-item-radio');
    });

    it('Checked_AriaCheckedTrue', () => {
      render(<MenuItemRadio checked={true} onSelect={noopSelect}>X</MenuItemRadio>);
      expect(screen.getByRole('menuitemradio')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('ClassNameForwarded_AppendedAsThirdToken', () => {
      render(
        <MenuItemRadio checked={false} className="foo" onSelect={noopSelect}>
          X
        </MenuItemRadio>
      );
      expect(screen.getByRole('menuitemradio')).toHaveAttribute(
        'class',
        'menu-item menu-item-radio foo'
      );
    });

    it('RefForwarding_PointsAtButton', () => {
      const ref = createRef<HTMLButtonElement>();
      render(
        <MenuItemRadio ref={ref} checked={false} onSelect={noopSelect}>
          X
        </MenuItemRadio>
      );
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('TypeOverride_ExplicitTypeWins', () => {
      render(
        <MenuItemRadio type="submit" checked={false} onSelect={noopSelect}>
          X
        </MenuItemRadio>
      );
      expect(screen.getByRole('menuitemradio')).toHaveAttribute(
        'type',
        'submit'
      );
    });
  });

  describe('ContentSlots', () => {
    it('IconProvided_IconSpanRenders', () => {
      const { container } = render(
        <MenuItemRadio
          icon={<svg data-testid="i" />}
          checked={false}
          onSelect={noopSelect}
        >
          X
        </MenuItemRadio>
      );
      const iconSpan = container.querySelector('.menu-item-radio__icon');
      expect(iconSpan).not.toBeNull();
      expect(
        iconSpan?.querySelector('[data-testid="i"]')
      ).not.toBeNull();
    });

    it('IconOmitted_NoIconSpan', () => {
      const { container } = render(
        <MenuItemRadio checked={false} onSelect={noopSelect}>X</MenuItemRadio>
      );
      expect(container.querySelector('.menu-item-radio__icon')).toBeNull();
    });

    it('Label_AlwaysRendered', () => {
      const { container } = render(
        <MenuItemRadio checked={false} onSelect={noopSelect}>Hello</MenuItemRadio>
      );
      const label = container.querySelector('.menu-item-radio__label');
      expect(label).not.toBeNull();
      expect(label?.textContent).toBe('Hello');
    });

    it('DescriptionProvided_DescriptionSpanRenders', () => {
      const { container } = render(
        <MenuItemRadio checked={false} description="d" onSelect={noopSelect}>
          X
        </MenuItemRadio>
      );
      const desc = container.querySelector('.menu-item-radio__description');
      expect(desc).not.toBeNull();
      expect(desc?.textContent).toBe('d');
    });

    it('DescriptionOmitted_NoDescriptionSpan', () => {
      const { container } = render(
        <MenuItemRadio checked={false} onSelect={noopSelect}>X</MenuItemRadio>
      );
      expect(
        container.querySelector('.menu-item-radio__description')
      ).toBeNull();
    });

    it('Checked_IndicatorShowsCheckmark', () => {
      const { container } = render(
        <MenuItemRadio checked={true} onSelect={noopSelect}>X</MenuItemRadio>
      );
      const indicator = container.querySelector(
        '.menu-item-radio__indicator'
      );
      expect(indicator).not.toBeNull();
      expect(indicator).toHaveAttribute('aria-hidden');
      expect(indicator?.textContent).toBe('✓');
    });

    it('Unchecked_IndicatorShowsEmpty', () => {
      const { container } = render(
        <MenuItemRadio checked={false} onSelect={noopSelect}>X</MenuItemRadio>
      );
      const indicator = container.querySelector(
        '.menu-item-radio__indicator'
      );
      // Stable-slot contract: indicator span is always present; only its
      // text content varies. A regression that conditionally omits the span
      // would fail this query.
      expect(indicator).not.toBeNull();
      expect(indicator?.textContent).toBe('');
    });
  });

  describe('SelectionGate', () => {
    it('NoOnClick_OnSelectCalled', async () => {
      const selectSpy = vi.fn();
      render(
        <MenuItemRadio checked={false} onSelect={selectSpy}>
          X
        </MenuItemRadio>
      );
      const user = userEvent.setup();
      await user.click(screen.getByRole('menuitemradio'));
      expect(selectSpy).toHaveBeenCalledTimes(1);
    });

    it('OnClickWithoutPreventDefault_BothRunInOrder', async () => {
      const clickSpy = vi.fn();
      const selectSpy = vi.fn();
      render(
        <MenuItemRadio
          checked={false}
          onClick={clickSpy}
          onSelect={selectSpy}
        >
          X
        </MenuItemRadio>
      );
      const user = userEvent.setup();
      await user.click(screen.getByRole('menuitemradio'));
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(selectSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy.mock.invocationCallOrder[0]).toBeLessThan(
        selectSpy.mock.invocationCallOrder[0]
      );
    });

    it('OnClickWithPreventDefault_OnSelectSuppressed', async () => {
      const clickSpy = vi.fn((e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
      });
      const selectSpy = vi.fn();
      render(
        <MenuItemRadio
          checked={false}
          onClick={clickSpy}
          onSelect={selectSpy}
        >
          X
        </MenuItemRadio>
      );
      const user = userEvent.setup();
      await user.click(screen.getByRole('menuitemradio'));
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(selectSpy).not.toHaveBeenCalled();
    });
  });

  describe('PropsPassthrough', () => {
    it('PassthroughProps_ReachButton', () => {
      render(
        <MenuItemRadio
          checked={false}
          disabled
          aria-disabled="true"
          aria-label="X label"
          data-testid="x"
          onSelect={() => {}}
        >
          X
        </MenuItemRadio>
      );
      const button = screen.getByRole('menuitemradio');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('aria-label', 'X label');
      expect(button).toHaveAttribute('data-testid', 'x');
    });
  });
});
