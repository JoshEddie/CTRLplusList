import { act, render, renderHook, screen } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { useRef, type ReactNode, type RefObject } from 'react';
import { usePopoverDismiss } from '../usePopoverDismiss';

// Harness that mounts the hook with a real DOM element attached to the ref.
// Renders an outside-the-popover sibling so tests can dispatch mousedown at
// targets both inside and outside the ref'd element.
function Harness({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  usePopoverDismiss({ open, onClose, ref });
  return (
    <div>
      <button type="button" data-testid="outside">
        Outside
      </button>
      <div ref={ref} data-testid="popover">
        <span data-testid="inside-child">child</span>
        {children}
      </div>
    </div>
  );
}

describe('usePopoverDismiss', () => {
  describe('ListenerLifecycle', () => {
    let addSpy: MockInstance<typeof document.addEventListener>;
    let removeSpy: MockInstance<typeof document.removeEventListener>;

    beforeEach(() => {
      addSpy = vi.spyOn(document, 'addEventListener');
      removeSpy = vi.spyOn(document, 'removeEventListener');
    });

    afterEach(() => {
      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('Closed_NoListenersAttached', () => {
      renderHook(() => {
        const ref = useRef<HTMLElement>(null);
        usePopoverDismiss({ open: false, onClose: vi.fn(), ref });
      });
      const mouseAdds = addSpy.mock.calls.filter(
        ([type]) => type === 'mousedown'
      );
      const keyAdds = addSpy.mock.calls.filter(([type]) => type === 'keydown');
      expect(mouseAdds.length).toBe(0);
      expect(keyAdds.length).toBe(0);
    });

    it('Open_BothListenersAttached', () => {
      renderHook(() => {
        const ref = useRef<HTMLElement>(null);
        usePopoverDismiss({ open: true, onClose: vi.fn(), ref });
      });
      const mouseAdds = addSpy.mock.calls.filter(
        ([type]) => type === 'mousedown'
      );
      const keyAdds = addSpy.mock.calls.filter(([type]) => type === 'keydown');
      expect(mouseAdds.length).toBe(1);
      expect(keyAdds.length).toBe(1);
    });

    it('Unmount_BothListenersRemoved', () => {
      const { unmount } = renderHook(() => {
        const ref = useRef<HTMLElement>(null);
        usePopoverDismiss({ open: true, onClose: vi.fn(), ref });
      });
      removeSpy.mockClear();
      unmount();
      const mouseRemoves = removeSpy.mock.calls.filter(
        ([type]) => type === 'mousedown'
      );
      const keyRemoves = removeSpy.mock.calls.filter(
        ([type]) => type === 'keydown'
      );
      expect(mouseRemoves.length).toBe(1);
      expect(keyRemoves.length).toBe(1);
    });

    it('ClosedAfterOpen_ListenersCleanedUp', () => {
      const { rerender } = renderHook(
        ({ open }: { open: boolean }) => {
          const ref = useRef<HTMLElement>(null);
          usePopoverDismiss({ open, onClose: vi.fn(), ref });
        },
        { initialProps: { open: true } }
      );
      removeSpy.mockClear();
      rerender({ open: false });
      const mouseRemoves = removeSpy.mock.calls.filter(
        ([type]) => type === 'mousedown'
      );
      const keyRemoves = removeSpy.mock.calls.filter(
        ([type]) => type === 'keydown'
      );
      expect(mouseRemoves.length).toBe(1);
      expect(keyRemoves.length).toBe(1);
    });

    it('OnCloseIdentityChange_ListenersReattached', () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      const { rerender } = renderHook(
        ({ onClose }: { onClose: () => void }) => {
          const ref = useRef<HTMLElement>(null);
          usePopoverDismiss({ open: true, onClose, ref });
        },
        { initialProps: { onClose: spy1 } }
      );
      rerender({ onClose: spy2 });
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape' })
        );
      });
      expect(spy2).toHaveBeenCalledTimes(1);
      expect(spy1).not.toHaveBeenCalled();
    });
  });

  describe('OutsideClick', () => {
    it('NullRef_OutsideMousedown-OnCloseNotCalled', () => {
      const onClose = vi.fn();
      renderHook(() => {
        const ref: RefObject<HTMLElement | null> = { current: null };
        usePopoverDismiss({ open: true, onClose, ref });
      });
      expect(() => {
        act(() => {
          document.body.dispatchEvent(
            new MouseEvent('mousedown', { bubbles: true })
          );
        });
      }).not.toThrow();
      expect(onClose).not.toHaveBeenCalled();
    });

    describe('PopulatedRef', () => {
      it('OutsideMousedown_OnCloseCalled', () => {
        const onClose = vi.fn();
        render(<Harness open={true} onClose={onClose} />);
        const outside = screen.getByTestId('outside');
        act(() => {
          outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        });
        expect(onClose).toHaveBeenCalledTimes(1);
      });

      it('InsideMousedown_OnCloseNotCalled', () => {
        const onClose = vi.fn();
        render(<Harness open={true} onClose={onClose} />);
        const insideChild = screen.getByTestId('inside-child');
        act(() => {
          insideChild.dispatchEvent(
            new MouseEvent('mousedown', { bubbles: true })
          );
        });
        expect(onClose).not.toHaveBeenCalled();
      });

      it('RefElementItself_OnCloseNotCalled', () => {
        const onClose = vi.fn();
        render(<Harness open={true} onClose={onClose} />);
        const popover = screen.getByTestId('popover');
        act(() => {
          popover.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        });
        expect(onClose).not.toHaveBeenCalled();
      });
    });
  });

  describe('EscapeKey', () => {
    it('Escape_OnCloseCalled', () => {
      const onClose = vi.fn();
      render(<Harness open={true} onClose={onClose} />);
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape' })
        );
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('OtherKey_OnCloseNotCalled', () => {
      const onClose = vi.fn();
      render(<Harness open={true} onClose={onClose} />);
      for (const key of ['a', 'Enter', ' ']) {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });
      }
      expect(onClose).not.toHaveBeenCalled();
    });

    it('Closed_EscapeDispatched-OnCloseNotCalled', () => {
      const onClose = vi.fn();
      render(<Harness open={false} onClose={onClose} />);
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape' })
        );
      });
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
