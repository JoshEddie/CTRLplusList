import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardOffset } from '../useKeyboardOffset';

interface VVMock {
  height: number;
  offsetTop: number;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

let vvListeners: Record<string, Array<() => void>>;
let vv: VVMock;
let rafCallbacks: FrameRequestCallback[];
let rafCounter: number;
let cancelSpy: ReturnType<typeof vi.fn>;
let rafSpy: ReturnType<typeof vi.fn>;

const originalVV = Object.getOwnPropertyDescriptor(window, 'visualViewport');
const originalInner = Object.getOwnPropertyDescriptor(window, 'innerHeight');

function installVv() {
  vvListeners = { resize: [], scroll: [] };
  vv = {
    height: 800,
    offsetTop: 0,
    addEventListener: vi.fn((type: string, l: () => void) => {
      vvListeners[type].push(l);
    }),
    removeEventListener: vi.fn((type: string, l: () => void) => {
      vvListeners[type] = vvListeners[type].filter((x) => x !== l);
    }),
  };
  Object.defineProperty(window, 'visualViewport', {
    value: vv,
    configurable: true,
    writable: true,
  });
}

function setInnerHeight(h: number) {
  Object.defineProperty(window, 'innerHeight', {
    value: h,
    configurable: true,
    writable: true,
  });
}

function flushRaf() {
  const cbs = rafCallbacks.splice(0);
  cbs.forEach((cb) => cb(performance.now()));
}

function Harness({ enabled }: { enabled: boolean }) {
  useKeyboardOffset(enabled);
  return null;
}

beforeEach(() => {
  rafCallbacks = [];
  rafCounter = 0;
  rafSpy = vi.fn((cb: FrameRequestCallback) => {
    rafCallbacks.push(cb);
    return ++rafCounter;
  });
  cancelSpy = vi.fn();
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
    rafSpy as unknown as typeof window.requestAnimationFrame
  );
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(
    cancelSpy as unknown as typeof window.cancelAnimationFrame
  );
  installVv();
  setInnerHeight(1000);
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalVV) {
    Object.defineProperty(window, 'visualViewport', originalVV);
  } else {
    Object.defineProperty(window, 'visualViewport', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  }
  if (originalInner) {
    Object.defineProperty(window, 'innerHeight', originalInner);
  } else {
    // No original descriptor — drop the own-property installed by setInnerHeight
    // so jsdom's prototype getter (default 768) takes over again. Mirrors the
    // visualViewport fallback above.
    Reflect.deleteProperty(window, 'innerHeight');
  }
  document.documentElement.style.removeProperty('--keyboard-offset');
});

describe('useKeyboardOffset', () => {
  describe('ShortCircuits', () => {
    it('EnabledFalse_NoListenersAttached_NoCssVariable', () => {
      render(<Harness enabled={false} />);
      expect(vv.addEventListener).not.toHaveBeenCalled();
      expect(rafSpy).not.toHaveBeenCalled();
      expect(
        document.documentElement.style.getPropertyValue('--keyboard-offset')
      ).toBe('');
    });

    it('EnabledTrueButNoVisualViewport_NoListenersAttached_NoCssVariable', () => {
      Object.defineProperty(window, 'visualViewport', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      render(<Harness enabled={true} />);
      expect(rafSpy).not.toHaveBeenCalled();
      expect(
        document.documentElement.style.getPropertyValue('--keyboard-offset')
      ).toBe('');
    });
  });

  describe('EnableFlow', () => {
    it('EnabledTrueWithViewport_RegistersResizeAndScrollListeners', () => {
      render(<Harness enabled={true} />);
      expect(vv.addEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
      expect(vv.addEventListener).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function)
      );
    });

    it('EnabledTrueWithViewport_SchedulesInitialRaf', () => {
      render(<Harness enabled={true} />);
      expect(rafSpy).toHaveBeenCalledTimes(1);
    });

    it('RafTick_WritesKeyboardOffsetOnDocumentElement', () => {
      vv.height = 600;
      vv.offsetTop = 0;
      setInnerHeight(1000);
      render(<Harness enabled={true} />);
      flushRaf();
      expect(
        document.documentElement.style.getPropertyValue('--keyboard-offset')
      ).toBe('400px');
    });

    it('RafTick_DoesNotSetOnBody', () => {
      render(<Harness enabled={true} />);
      flushRaf();
      expect(document.body.style.getPropertyValue('--keyboard-offset')).toBe('');
    });

    it('OffsetClampedToZero_WhenComputationWouldBeNegative', () => {
      vv.height = 600;
      vv.offsetTop = 600;
      setInnerHeight(1000);
      render(<Harness enabled={true} />);
      flushRaf();
      expect(
        document.documentElement.style.getPropertyValue('--keyboard-offset')
      ).toBe('0px');
    });
  });

  describe('RafCoalescing', () => {
    it('ResizeFiredDuringPendingRaf_NoSecondRafScheduled', () => {
      render(<Harness enabled={true} />);
      // Initial schedule from mount = 1 raf call.
      expect(rafSpy).toHaveBeenCalledTimes(1);
      // Fire resize before the pending RAF ticks: no second RAF.
      vvListeners.resize[0]();
      expect(rafSpy).toHaveBeenCalledTimes(1);
    });

    it('RafTickThenResize_SchedulesNewRaf', () => {
      render(<Harness enabled={true} />);
      flushRaf();
      expect(rafSpy).toHaveBeenCalledTimes(1);
      vvListeners.resize[0]();
      expect(rafSpy).toHaveBeenCalledTimes(2);
    });

    it('ScrollEvent_TriggersRafSchedule', () => {
      render(<Harness enabled={true} />);
      flushRaf();
      const before = rafSpy.mock.calls.length;
      vvListeners.scroll[0]();
      expect(rafSpy.mock.calls.length).toBe(before + 1);
    });
  });

  describe('CleanupFlow', () => {
    it('EnableToggleToFalse_CancelsPendingRaf', () => {
      const { rerender } = render(<Harness enabled={true} />);
      // Pending RAF (id 1). Re-render disabled → effect cleanup runs.
      rerender(<Harness enabled={false} />);
      expect(cancelSpy).toHaveBeenCalledWith(1);
    });

    it('EnableToggleToFalse_RemovesViewportListeners', () => {
      const { rerender } = render(<Harness enabled={true} />);
      rerender(<Harness enabled={false} />);
      expect(vv.removeEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
      expect(vv.removeEventListener).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function)
      );
    });

    it('EnableToggleToFalse_RemovesCssVariable', () => {
      const { rerender } = render(<Harness enabled={true} />);
      flushRaf();
      expect(
        document.documentElement.style.getPropertyValue('--keyboard-offset')
      ).not.toBe('');
      rerender(<Harness enabled={false} />);
      expect(
        document.documentElement.style.getPropertyValue('--keyboard-offset')
      ).toBe('');
    });

    it('Unmount_WhileEnabled_CleansUpRafListenersCssVariable', () => {
      const { unmount } = render(<Harness enabled={true} />);
      flushRaf();
      unmount();
      expect(cancelSpy).not.toHaveBeenCalled();
      expect(vv.removeEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
      expect(vv.removeEventListener).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function)
      );
      expect(
        document.documentElement.style.getPropertyValue('--keyboard-offset')
      ).toBe('');
    });

    it('Unmount_WhenNotEnabled_DoesNothing', () => {
      const { unmount } = render(<Harness enabled={false} />);
      unmount();
      expect(cancelSpy).not.toHaveBeenCalled();
      expect(vv.removeEventListener).not.toHaveBeenCalled();
      expect(
        document.documentElement.style.getPropertyValue('--keyboard-offset')
      ).toBe('');
    });
  });
});
