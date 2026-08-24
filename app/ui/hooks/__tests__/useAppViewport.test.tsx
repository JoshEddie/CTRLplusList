import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppViewport } from '../useAppViewport';

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
  vvListeners = { resize: [] };
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

function focusInput() {
  const input = document.createElement('input');
  document.body.appendChild(input);
  input.focus();
  return input;
}

function flushRaf() {
  const cbs = rafCallbacks.splice(0);
  cbs.forEach((cb) => cb(performance.now()));
}

function Harness() {
  useAppViewport();
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
  document.body.innerHTML = '';
});

describe('useAppViewport', () => {
  describe('ShortCircuits', () => {
    it('NoVisualViewport_NoListenersAttached-NoCssVariable', () => {
      Object.defineProperty(window, 'visualViewport', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      render(<Harness />);
      expect(rafSpy).not.toHaveBeenCalled();
      expect(
        document.documentElement.style.getPropertyValue('--keyboard-offset')
      ).toBe('');
    });
  });

  describe('MeasureFlow', () => {
    it('WithViewport_RegistersResizeListenerOnly', () => {
      render(<Harness />);
      expect(vv.addEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
      expect(vv.addEventListener).toHaveBeenCalledTimes(1);
    });

    it('WithViewport_SchedulesInitialRaf', () => {
      render(<Harness />);
      expect(rafSpy).toHaveBeenCalledTimes(1);
    });

    it('RafTick_WritesKeyboardOffsetOnDocumentElement', () => {
      vv.height = 600;
      vv.offsetTop = 0;
      setInnerHeight(1000);
      render(<Harness />);
      flushRaf();
      expect(
        document.documentElement.style.getPropertyValue('--keyboard-offset')
      ).toBe('400px');
    });

    it('RafTick_DoesNotSetOnBody', () => {
      render(<Harness />);
      flushRaf();
      expect(document.body.style.getPropertyValue('--keyboard-offset')).toBe(
        ''
      );
    });

    it('OffsetClampedToZero_WhenComputationWouldBeNegative', () => {
      vv.height = 1200;
      setInnerHeight(1000);
      render(<Harness />);
      flushRaf();
      expect(
        document.documentElement.style.getPropertyValue('--keyboard-offset')
      ).toBe('0px');
    });

    it('VisualViewportScrolledWithinLayoutViewport_OffsetUnchanged', () => {
      vv.height = 600;
      setInnerHeight(1000);
      render(<Harness />);
      flushRaf();
      vv.offsetTop = 150;
      vvListeners.resize[0]();
      flushRaf();
      expect(
        document.documentElement.style.getPropertyValue('--keyboard-offset')
      ).toBe('400px');
    });
  });

  describe('RafCoalescing', () => {
    it('ResizeFiredDuringPendingRaf_NoSecondRafScheduled', () => {
      render(<Harness />);
      // Initial schedule from mount = 1 raf call.
      expect(rafSpy).toHaveBeenCalledTimes(1);
      // Fire resize before the pending RAF ticks: no second RAF.
      vvListeners.resize[0]();
      expect(rafSpy).toHaveBeenCalledTimes(1);
    });

    it('RafTickThenResize_SchedulesNewRaf', () => {
      render(<Harness />);
      flushRaf();
      expect(rafSpy).toHaveBeenCalledTimes(1);
      vvListeners.resize[0]();
      expect(rafSpy).toHaveBeenCalledTimes(2);
    });

    it('UnchangedOffset_DoesNotRewriteCssVariable', () => {
      render(<Harness />);
      flushRaf();
      document.documentElement.style.removeProperty('--keyboard-offset');
      vvListeners.resize[0]();
      flushRaf();
      expect(
        document.documentElement.style.getPropertyValue('--keyboard-offset')
      ).toBe('');
    });
  });

  describe('CleanupFlow', () => {
    it('UnmountWithRafPending_CancelsPendingRaf', () => {
      const { unmount } = render(<Harness />);
      // Pending RAF (id 1) from mount, never flushed.
      unmount();
      expect(cancelSpy).toHaveBeenCalledWith(1);
    });

    it('Unmount_CleansUpListenersAndCssVariable', () => {
      const { unmount } = render(<Harness />);
      flushRaf();
      unmount();
      expect(cancelSpy).not.toHaveBeenCalled();
      expect(vv.removeEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
      expect(
        document.documentElement.style.getPropertyValue('--keyboard-offset')
      ).toBe('');
    });
  });

  describe('RevealFocusedField', () => {
    it('KeyboardGrows_ScrollsFocusedFieldIntoView', () => {
      const input = focusInput();
      const scrollIntoView = vi.fn();
      input.scrollIntoView = scrollIntoView;
      render(<Harness />);
      flushRaf();
      vv.height = 384;
      setInnerHeight(714);
      vvListeners.resize[0]();
      flushRaf();
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
    });

    it('KeyboardShrinks_DoesNotScrollFocusedField', () => {
      vv.height = 384;
      setInnerHeight(714);
      render(<Harness />);
      flushRaf();
      const input = focusInput();
      const scrollIntoView = vi.fn();
      input.scrollIntoView = scrollIntoView;
      vv.height = 714;
      vvListeners.resize[0]();
      flushRaf();
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('MountedWithKeyboardAlreadyOpen_DoesNotScrollFocusedField', () => {
      const input = focusInput();
      const scrollIntoView = vi.fn();
      input.scrollIntoView = scrollIntoView;
      vv.height = 384;
      setInnerHeight(714);
      render(<Harness />);
      flushRaf();
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('KeyboardGrowsWithNoFieldFocused_DoesNotScrollBodyIntoView', () => {
      const scrollIntoView = vi.fn();
      document.body.scrollIntoView = scrollIntoView;
      render(<Harness />);
      flushRaf();
      vv.height = 384;
      setInnerHeight(714);
      vvListeners.resize[0]();
      flushRaf();
      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });
});
