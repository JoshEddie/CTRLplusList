/* eslint-disable testing-library/no-node-access --
 * The icon-before-children DOM-order contract is asserted by comparing child
 * positions on the rendered button; no role/text query can describe ordering.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MenuItem } from '../MenuItem';

describe('MenuItem', () => {
  describe('DomShape', () => {
    it('Default_RendersButtonWithRoleMenuitem', () => {
      render(<MenuItem>X</MenuItem>);
      const button = screen.getByRole('menuitem');
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('class', 'menu-item');
      expect(button).toHaveTextContent('X');
    });

    it('Icon_RendersBeforeChildren', () => {
      render(
        <MenuItem icon={<svg data-testid="i" />}>Text</MenuItem>
      );
      const button = screen.getByRole('menuitem');
      const icon = screen.getByTestId('i');
      // Icon comes before text in DOM order.
      expect(button.firstChild).toBe(icon);
      expect(button.textContent).toBe('Text');
    });
  });

  describe('ClassComposition', () => {
    it('ToneDanger_AddsToneDangerClass', () => {
      render(<MenuItem tone="danger">X</MenuItem>);
      expect(screen.getByRole('menuitem')).toHaveAttribute(
        'class',
        'menu-item tone-danger'
      );
    });

    it('ToneDefault_NoToneClass', () => {
      render(<MenuItem tone="default">X</MenuItem>);
      expect(screen.getByRole('menuitem')).toHaveAttribute(
        'class',
        'menu-item'
      );
    });

    it('ToneOmitted_NoToneClass', () => {
      render(<MenuItem>X</MenuItem>);
      expect(screen.getByRole('menuitem')).toHaveAttribute(
        'class',
        'menu-item'
      );
    });

    it('ClassNameForwarded_AppendedAsExtra', () => {
      render(
        <MenuItem tone="danger" className="foo">
          X
        </MenuItem>
      );
      expect(screen.getByRole('menuitem')).toHaveAttribute(
        'class',
        'menu-item tone-danger foo'
      );
    });
  });

  describe('PropsPassthrough', () => {
    it('TypeOverride_ExplicitTypeWins', () => {
      render(<MenuItem type="submit">X</MenuItem>);
      expect(screen.getByRole('menuitem')).toHaveAttribute('type', 'submit');
    });

    it('RefForwarding_PointsAtButton', () => {
      const ref = createRef<HTMLButtonElement>();
      render(<MenuItem ref={ref}>X</MenuItem>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('OnClick_InvokedOnClick', async () => {
      const spy = vi.fn();
      render(<MenuItem onClick={spy}>X</MenuItem>);
      const user = userEvent.setup();
      await user.click(screen.getByRole('menuitem'));
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('PassthroughProps_ReachButton', () => {
      render(
        <MenuItem
          aria-disabled="true"
          disabled
          aria-label="X label"
          data-testid="x"
        >
          X
        </MenuItem>
      );
      const button = screen.getByRole('menuitem');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-label', 'X label');
      expect(button).toHaveAttribute('data-testid', 'x');
    });
  });
});
