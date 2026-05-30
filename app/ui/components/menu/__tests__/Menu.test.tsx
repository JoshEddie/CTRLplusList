/* eslint-disable testing-library/no-node-access --
 * Menu's two `useEffect` bodies attach document-level (outside-click / Escape)
 * and container-level (arrow-key navigation) keydown listeners; verifying
 * their attachment, dismissal targets, and the initial-focus `{ preventScroll:
 * true }` argument all require direct element traversal rather than role
 * queries. See design.md Decisions 4 and 7.
 */
import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import {
  createRef,
  forwardRef,
  useImperativeHandle,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { Menu } from '../Menu';
import { MenuItem } from '../MenuItem';
import { MenuItemRadio } from '../MenuItemRadio';
import { MenuLinkItem } from '../MenuLinkItem';

// Mock `next/link` so `<MenuLinkItem>` renders under jsdom without an
// AppRouterContext. Mirrors the inline mock in MenuLinkItem.test.tsx /
// LinkButton.test.tsx — no foundation-level mock exists.
vi.mock('next/link', () => ({
  default: forwardRef<
    HTMLAnchorElement,
    React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
  >(function MockLink({ children, href, ...rest }, ref) {
    return (
      <a ref={ref} href={href} {...rest}>
        {children}
      </a>
    );
  }),
}));

type HarnessProps = {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  // When provided, the harness exposes a ref to a real anchor button
  // attached above the popover.
  withAnchor?: boolean;
  ariaLabel?: string;
};

// Harness that renders a real anchor element alongside the Menu so the
// anchor-aware outside-click / focus-back behaviors can be exercised against
// genuine DOM nodes.
const Harness = forwardRef<
  { anchorRef: RefObject<HTMLButtonElement | null> },
  HarnessProps
>(function Harness({ open, onClose, children, withAnchor, ariaLabel }, ref) {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  useImperativeHandle(ref, () => ({ anchorRef }));
  return (
    <>
      {withAnchor && (
        <button ref={anchorRef} type="button" data-testid="anchor">
          Trigger
        </button>
      )}
      <Menu
        open={open}
        onClose={onClose}
        anchorRef={withAnchor ? anchorRef : undefined}
        aria-label={ariaLabel ?? 'Menu'}
      >
        {children}
      </Menu>
    </>
  );
});

function renderMenu(props: HarnessProps) {
  const harnessRef = createRef<{
    anchorRef: RefObject<HTMLButtonElement | null>;
  }>();
  const utils = render(<Harness ref={harnessRef} {...props} />);
  return { ...utils, harnessRef };
}

describe('Menu', () => {
  describe('Lifecycle', () => {
    it('Closed_ReturnsNull', () => {
      const { container } = render(
        <Menu open={false} onClose={vi.fn()} aria-label="x">
          <MenuItem>A</MenuItem>
        </Menu>
      );
      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('Open_RendersPopoverWithRoleMenu', () => {
      render(
        <Menu open={true} onClose={vi.fn()} aria-label="Actions">
          <MenuItem>A</MenuItem>
        </Menu>
      );
      const popover = screen.getByRole('menu');
      expect(popover.tagName).toBe('DIV');
      expect(popover).toHaveClass('menu-popover');
      expect(popover).toHaveAttribute('aria-label', 'Actions');
      expect(popover).toContainElement(screen.getByRole('menuitem'));
    });

    it('Open_AriaLabelledbyForwarded', () => {
      render(
        <Menu open={true} onClose={vi.fn()} aria-labelledby="some-id">
          <MenuItem>A</MenuItem>
        </Menu>
      );
      expect(screen.getByRole('menu')).toHaveAttribute(
        'aria-labelledby',
        'some-id'
      );
    });

    it('ClassName_AppendedAfterMenuPopover', () => {
      const { rerender } = render(
        <Menu
          open={true}
          onClose={vi.fn()}
          aria-label="x"
          className="custom"
        >
          <MenuItem>A</MenuItem>
        </Menu>
      );
      expect(screen.getByRole('menu')).toHaveAttribute(
        'class',
        'menu-popover custom'
      );

      rerender(
        <Menu open={true} onClose={vi.fn()} aria-label="x">
          <MenuItem>A</MenuItem>
        </Menu>
      );
      expect(screen.getByRole('menu')).toHaveAttribute(
        'class',
        'menu-popover'
      );

      rerender(
        <Menu open={true} onClose={vi.fn()} aria-label="x" className="">
          <MenuItem>A</MenuItem>
        </Menu>
      );
      expect(screen.getByRole('menu')).toHaveAttribute(
        'class',
        'menu-popover'
      );
    });

    it('RefForwarding_PointsAtPopover', () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <Menu ref={ref} open={true} onClose={vi.fn()} aria-label="x">
          <MenuItem>A</MenuItem>
        </Menu>
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current?.getAttribute('role')).toBe('menu');
    });
  });

  describe('DismissalListeners', () => {
    it('EscapeKey_OnCloseCalledAndAnchorFocused', () => {
      const onClose = vi.fn();
      const { harnessRef } = renderMenu({
        open: true,
        onClose,
        withAnchor: true,
        children: <MenuItem>A</MenuItem>,
      });
      const anchor = harnessRef.current?.anchorRef
        .current as HTMLButtonElement;
      const focusSpy = vi.spyOn(anchor, 'focus');

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(focusSpy).toHaveBeenCalledTimes(1);
    });

    it('OutsideClick_OnCloseCalledAndAnchorFocused', () => {
      const onClose = vi.fn();
      const { harnessRef } = renderMenu({
        open: true,
        onClose,
        withAnchor: true,
        children: <MenuItem>A</MenuItem>,
      });
      const anchor = harnessRef.current?.anchorRef
        .current as HTMLButtonElement;
      const focusSpy = vi.spyOn(anchor, 'focus');

      act(() => {
        document.body.dispatchEvent(
          new MouseEvent('mousedown', { bubbles: true })
        );
      });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(focusSpy).toHaveBeenCalledTimes(1);
    });

    it('InsidePopoverClick_OnCloseNotCalled', () => {
      const onClose = vi.fn();
      renderMenu({
        open: true,
        onClose,
        withAnchor: true,
        children: <MenuItem>A</MenuItem>,
      });
      const inside = screen.getByRole('menuitem');
      act(() => {
        inside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('OutsideClick_AnchorIgnored', () => {
      const onClose = vi.fn();
      const { harnessRef } = renderMenu({
        open: true,
        onClose,
        withAnchor: true,
        children: <MenuItem>A</MenuItem>,
      });
      const anchor = harnessRef.current?.anchorRef
        .current as HTMLButtonElement;
      act(() => {
        anchor.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('Closed_ListenersNotAttached', () => {
      const onClose = vi.fn();
      renderMenu({
        open: false,
        onClose,
        children: <MenuItem>A</MenuItem>,
      });
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('OpenThenClose_ListenersCleanedUp', () => {
      const onClose = vi.fn();
      const { rerender } = render(
        <Menu open={true} onClose={onClose} aria-label="x">
          <MenuItem>A</MenuItem>
        </Menu>
      );
      rerender(
        <Menu open={false} onClose={onClose} aria-label="x">
          <MenuItem>A</MenuItem>
        </Menu>
      );
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('Unmount_ListenersCleanedUp', () => {
      const onClose = vi.fn();
      const { unmount } = render(
        <Menu open={true} onClose={onClose} aria-label="x">
          <MenuItem>A</MenuItem>
        </Menu>
      );
      unmount();
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('NoAnchorRef_DismissDoesNotThrow', () => {
      const onClose = vi.fn();
      render(
        <Menu open={true} onClose={onClose} aria-label="x">
          <MenuItem>A</MenuItem>
        </Menu>
      );
      expect(() => {
        act(() => {
          document.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape' })
          );
        });
      }).not.toThrow();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('KeyboardNavigation', () => {
    function renderThreeItems(extra?: ReactNode) {
      return render(
        <Menu open={true} onClose={vi.fn()} aria-label="x">
          <MenuItem>First</MenuItem>
          <MenuItem>Second</MenuItem>
          <MenuItem>Third</MenuItem>
          {extra}
        </Menu>
      );
    }

    it('ArrowDown_FocusesNextItem', () => {
      renderThreeItems();
      const items = screen.getAllByRole('menuitem');
      items[0].focus();
      const popover = screen.getByRole('menu');
      fireEvent.keyDown(popover, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(items[1]);
    });

    it('ArrowDown_WrapsFromLastToFirst', () => {
      renderThreeItems();
      const items = screen.getAllByRole('menuitem');
      items[2].focus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      expect(document.activeElement).toBe(items[0]);
    });

    it('ArrowUp_FocusesPreviousItem', () => {
      renderThreeItems();
      const items = screen.getAllByRole('menuitem');
      items[1].focus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
      expect(document.activeElement).toBe(items[0]);
    });

    it('ArrowUp_WrapsFromFirstToLast', () => {
      renderThreeItems();
      const items = screen.getAllByRole('menuitem');
      items[0].focus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
      expect(document.activeElement).toBe(items[2]);
    });

    it('Home_FocusesFirstItem', () => {
      renderThreeItems();
      const items = screen.getAllByRole('menuitem');
      items[1].focus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Home' });
      expect(document.activeElement).toBe(items[0]);
    });

    it('End_FocusesLastItem', () => {
      renderThreeItems();
      const items = screen.getAllByRole('menuitem');
      items[1].focus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'End' });
      expect(document.activeElement).toBe(items[2]);
    });

    it('ArrowDown_SkipsAriaDisabled', () => {
      render(
        <Menu open={true} onClose={vi.fn()} aria-label="x">
          <MenuItem>First</MenuItem>
          <MenuItem aria-disabled="true">Disabled</MenuItem>
          <MenuItem>Third</MenuItem>
        </Menu>
      );
      const first = screen.getByRole('menuitem', { name: 'First' });
      const third = screen.getByRole('menuitem', { name: 'Third' });
      first.focus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      expect(document.activeElement).toBe(third);
    });

    it('FocusOutsideMenu_ArrowDownStartsAtFirst', () => {
      renderThreeItems();
      const items = screen.getAllByRole('menuitem');
      // Initial-focus effect put focus on items[0]; move focus off the menu
      // so currentIndex resolves to -1.
      (document.body as HTMLElement).focus();
      // jsdom may not focus body via focus(); also blur the active item.
      (document.activeElement as HTMLElement | null)?.blur?.();
      expect(document.activeElement).toBe(document.body);

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      expect(document.activeElement).toBe(items[0]);
    });

    it('ZeroItems_KeyHandlerReturnsEarly', () => {
      render(
        <Menu open={true} onClose={vi.fn()} aria-label="x">
          {null}
        </Menu>
      );
      const popover = screen.getByRole('menu');
      const prevActive = document.activeElement;
      expect(() => {
        fireEvent.keyDown(popover, { key: 'ArrowDown' });
      }).not.toThrow();
      expect(document.activeElement).toBe(prevActive);
    });

    it('KeyHandled_PreventDefaultCalled', () => {
      renderThreeItems();
      const popover = screen.getByRole('menu');
      const items = screen.getAllByRole('menuitem');
      items[0].focus();

      for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End']) {
        const event = new KeyboardEvent('keydown', {
          key,
          bubbles: true,
          cancelable: true,
        });
        act(() => {
          popover.dispatchEvent(event);
        });
        expect(event.defaultPrevented).toBe(true);
      }
    });

    it('UnhandledKey_NoPreventDefault', () => {
      renderThreeItems();
      const popover = screen.getByRole('menu');
      const items = screen.getAllByRole('menuitem');
      items[0].focus();
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        bubbles: true,
        cancelable: true,
      });
      act(() => {
        popover.dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(false);
    });

    it('MixedRowTypes_NavigatedUniformly', () => {
      render(
        <Menu open={true} onClose={vi.fn()} aria-label="x">
          <MenuItem>Button</MenuItem>
          <MenuItemRadio checked={false} onSelect={() => {}}>
            Radio
          </MenuItemRadio>
          <MenuLinkItem href="/x">Link</MenuLinkItem>
        </Menu>
      );
      const button = screen.getByRole('menuitem', { name: 'Button' });
      const radio = screen.getByRole('menuitemradio', { name: /Radio/ });
      const link = screen.getByRole('menuitem', { name: 'Link' });

      button.focus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      expect(document.activeElement).toBe(radio);

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      expect(document.activeElement).toBe(link);
    });
  });

  describe('InitialFocus', () => {
    let focusSpy: MockInstance<
      (this: HTMLElement, options?: FocusOptions) => void
    >;

    beforeEach(() => {
      focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    });

    afterEach(() => {
      focusSpy.mockRestore();
    });

    it('Open_FirstItemFocusedWithPreventScroll', () => {
      render(
        <Menu open={true} onClose={vi.fn()} aria-label="x">
          <MenuItem>First</MenuItem>
          <MenuItem>Second</MenuItem>
        </Menu>
      );
      const first = screen.getByRole('menuitem', { name: 'First' });
      const calls = focusSpy.mock.calls.filter(
        (_, idx) => focusSpy.mock.instances[idx] === first
      );
      expect(calls.length).toBeGreaterThanOrEqual(1);
      expect(calls[0][0]).toEqual({ preventScroll: true });
    });

    it('Open_FirstEnabledItemFocused', () => {
      render(
        <Menu open={true} onClose={vi.fn()} aria-label="x">
          <MenuItem aria-disabled="true">Disabled</MenuItem>
          <MenuItem>Enabled</MenuItem>
        </Menu>
      );
      const enabled = screen.getByRole('menuitem', { name: 'Enabled' });
      const disabled = screen.getByRole('menuitem', { name: 'Disabled' });
      const enabledCalls = focusSpy.mock.calls.filter(
        (_, idx) => focusSpy.mock.instances[idx] === enabled
      );
      const disabledCalls = focusSpy.mock.calls.filter(
        (_, idx) => focusSpy.mock.instances[idx] === disabled
      );
      expect(enabledCalls.length).toBeGreaterThanOrEqual(1);
      expect(enabledCalls[0][0]).toEqual({ preventScroll: true });
      expect(disabledCalls.length).toBe(0);
    });

    it('OpenNoItems_FocusNotCalled', () => {
      render(
        <Menu open={true} onClose={vi.fn()} aria-label="x">
          {null}
        </Menu>
      );
      // No menuitem-role elements exist, so the spy should not have been
      // invoked on any element that bears `[role^="menuitem"]`.
      const menuitemCalls = focusSpy.mock.calls.filter((_, idx) => {
        const inst = focusSpy.mock.instances[idx] as HTMLElement;
        const role = inst?.getAttribute?.('role') ?? '';
        return role.startsWith('menuitem');
      });
      expect(menuitemCalls.length).toBe(0);
    });
  });
});
