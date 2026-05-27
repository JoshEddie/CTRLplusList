/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * Several assertions need direct DOM traversal: the chevron is decorative
 * (aria-hidden) so RTL role queries cannot find it; the count badge and the
 * label span have no role and are located by class name to assert presence-
 * or-absence under the zero-suppression gate and the icon/label DOM order.
 * `container.querySelector` is the correct tool here. See design.md
 * Decisions 3a/3b/3c.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { PopoverTrigger } from '../PopoverTrigger';

describe('PopoverTrigger', () => {
  describe('DomShape', () => {
    it('Default_RendersButtonWithPopoverTriggerClass', () => {
      render(<PopoverTrigger label="x" />);
      const btn = screen.getByRole('button');
      expect(btn.tagName).toBe('BUTTON');
      expect(btn).toHaveAttribute('type', 'button');
      expect(btn).toHaveClass('popover-trigger');
    });

    it('LabelRenders_InLabelSpan', () => {
      const { container } = render(<PopoverTrigger label="Stores" />);
      const labelSpan = container.querySelector('.popover-trigger-label');
      expect(labelSpan).not.toBeNull();
      expect(labelSpan).toHaveTextContent('Stores');
    });

    it('LabelOrder_IconBeforeLabel', () => {
      const { container } = render(
        <PopoverTrigger icon={<svg data-testid="i" />} label="Stores" />
      );
      const btn = screen.getByRole('button');
      const icon = screen.getByTestId('i');
      const labelSpan = container.querySelector('.popover-trigger-label');
      expect(labelSpan).not.toBeNull();
      const children = Array.from(btn.children);
      const iconIdx = children.indexOf(icon);
      const labelIdx = children.indexOf(labelSpan as Element);
      expect(iconIdx).toBeGreaterThanOrEqual(0);
      expect(labelIdx).toBeGreaterThan(iconIdx);
    });

    it('RefForwarding_PointsAtButton', () => {
      const ref = createRef<HTMLButtonElement>();
      render(<PopoverTrigger ref={ref} label="x" />);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('TypeOverride_ExplicitTypeWins', () => {
      render(<PopoverTrigger type="submit" label="x" />);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });
  });

  describe('ClassComposition', () => {
    it('ToneOnDark_AddsToneOnDarkClass', () => {
      render(<PopoverTrigger tone="on-dark" label="x" />);
      expect(screen.getByRole('button')).toHaveClass('tone-on-dark');
    });

    it('ToneLight_NoToneOnDarkClass', () => {
      render(<PopoverTrigger tone="light" label="x" />);
      expect(screen.getByRole('button')).not.toHaveClass('tone-on-dark');
    });

    it('ToneOmitted_DefaultsToLight', () => {
      render(<PopoverTrigger label="x" />);
      expect(screen.getByRole('button')).not.toHaveClass('tone-on-dark');
    });

    it('ActiveTrue_AddsActiveClass', () => {
      render(<PopoverTrigger active label="x" />);
      expect(screen.getByRole('button')).toHaveClass('active');
    });

    it('ActiveFalse_NoActiveClass', () => {
      render(<PopoverTrigger active={false} label="x" />);
      expect(screen.getByRole('button')).not.toHaveClass('active');
    });

    it('ClassNameForwarded_AppendedAsExtra', () => {
      render(
        <PopoverTrigger tone="on-dark" active className="foo" label="x" />
      );
      expect(screen.getByRole('button')).toHaveAttribute(
        'class',
        'popover-trigger tone-on-dark active foo'
      );
    });
  });

  describe('CountBadge', () => {
    it('CountPositive_RendersBadge', () => {
      const { container } = render(<PopoverTrigger count={3} label="x" />);
      const badge = container.querySelector('.popover-trigger-count');
      expect(badge).not.toBeNull();
      expect(badge).toHaveTextContent('3');
    });

    it('CountZero_NoBadgeSpan', () => {
      const { container } = render(<PopoverTrigger count={0} label="x" />);
      expect(container.querySelector('.popover-trigger-count')).toBeNull();
    });

    it('CountUndefined_NoBadgeSpan', () => {
      const { container } = render(
        <PopoverTrigger count={undefined} label="x" />
      );
      expect(container.querySelector('.popover-trigger-count')).toBeNull();
    });

    it('CountOmitted_NoBadgeSpan', () => {
      const { container } = render(<PopoverTrigger label="x" />);
      expect(container.querySelector('.popover-trigger-count')).toBeNull();
    });

    it('CountLargeNumber_RendersAsText', () => {
      const { container } = render(<PopoverTrigger count={42} label="x" />);
      const badge = container.querySelector('.popover-trigger-count');
      expect(badge).not.toBeNull();
      expect(badge).toHaveTextContent('42');
    });
  });

  describe('Chevron', () => {
    it('Chevron_AlwaysRendered', () => {
      const { container } = render(<PopoverTrigger label="x" />);
      const chevron = container.querySelector('.popover-trigger-chevron');
      expect(chevron).not.toBeNull();
      expect(chevron?.tagName.toLowerCase()).toBe('svg');
    });

    it('Chevron_AriaHiddenTrue', () => {
      const { container } = render(<PopoverTrigger label="x" />);
      const chevron = container.querySelector('.popover-trigger-chevron');
      expect(chevron).toHaveAttribute('aria-hidden', 'true');
    });

    it('Chevron_NoRoleNoAriaLabel', () => {
      const { container } = render(<PopoverTrigger label="x" />);
      const chevron = container.querySelector('.popover-trigger-chevron');
      expect(chevron?.hasAttribute('role')).toBe(false);
      expect(chevron?.hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('PropsPassthrough', () => {
    it('OnClick_InvokedOnClick', () => {
      const onClick = vi.fn();
      render(<PopoverTrigger onClick={onClick} label="x" />);
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('PassthroughProps_ReachButton', () => {
      render(
        <PopoverTrigger
          label="x"
          aria-haspopup="dialog"
          aria-expanded
          aria-label="open stores"
          disabled
          data-testid="trigger"
        />
      );
      const btn = screen.getByTestId('trigger');
      expect(btn).toHaveAttribute('aria-haspopup', 'dialog');
      expect(btn).toHaveAttribute('aria-expanded', 'true');
      expect(btn).toHaveAttribute('aria-label', 'open stores');
      expect(btn).toBeDisabled();
    });
  });
});
