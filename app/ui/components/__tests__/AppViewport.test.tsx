import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppViewport from '../AppViewport';

interface VVMock {
  height: number;
  offsetTop: number;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

let vvListeners: Record<string, Array<() => void>>;
let vv: VVMock;

const originalVV = Object.getOwnPropertyDescriptor(window, 'visualViewport');

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

function cssVar(name: string) {
  return document.documentElement.style.getPropertyValue(name);
}

function fire(type: 'resize' | 'scroll') {
  vvListeners[type].forEach((l) => l());
}

beforeEach(() => {
  installVv();
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
  document.documentElement.style.removeProperty('--app-viewport-height');
  document.documentElement.style.removeProperty('--app-viewport-top');
  document.body.innerHTML = '';
});

describe('AppViewport', () => {
  describe('ShortCircuits', () => {
    it('NoVisualViewport_NoListenersAttached-NoCssVariables', () => {
      Object.defineProperty(window, 'visualViewport', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      render(<AppViewport />);
      expect(vv.addEventListener).not.toHaveBeenCalled();
      expect(cssVar('--app-viewport-height')).toBe('');
      expect(cssVar('--app-viewport-top')).toBe('');
    });
  });

  describe('MeasureFlow', () => {
    it('Mount_ListensForResizeAndScroll', () => {
      render(<AppViewport />);
      expect(vv.addEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
      expect(vv.addEventListener).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function)
      );
    });

    it('Mount_WritesBandOnDocumentElement', () => {
      vv.height = 600;
      vv.offsetTop = 40;
      render(<AppViewport />);
      expect(cssVar('--app-viewport-height')).toBe('600px');
      expect(cssVar('--app-viewport-top')).toBe('40px');
    });

    it('Mount_DoesNotSetOnBody', () => {
      render(<AppViewport />);
      expect(document.body.style.getPropertyValue('--app-viewport-height')).toBe(
        ''
      );
    });

    it('FractionalMeasurements_RoundedToWholePixels', () => {
      vv.height = 599.6;
      vv.offsetTop = 40.2;
      render(<AppViewport />);
      expect(cssVar('--app-viewport-height')).toBe('600px');
      expect(cssVar('--app-viewport-top')).toBe('40px');
    });

    it('Resize_RewritesHeight', () => {
      render(<AppViewport />);
      vv.height = 384;
      fire('resize');
      expect(cssVar('--app-viewport-height')).toBe('384px');
    });

    it('Scroll_RewritesTopWithoutResize', () => {
      render(<AppViewport />);
      vv.offsetTop = 150;
      fire('scroll');
      expect(cssVar('--app-viewport-top')).toBe('150px');
      expect(cssVar('--app-viewport-height')).toBe('800px');
    });

    it('UnchangedBand_DoesNotRewriteCssVariables', () => {
      render(<AppViewport />);
      document.documentElement.style.removeProperty('--app-viewport-height');
      document.documentElement.style.removeProperty('--app-viewport-top');
      fire('resize');
      expect(cssVar('--app-viewport-height')).toBe('');
      expect(cssVar('--app-viewport-top')).toBe('');
    });

    it('HeightChangedButTopUnchanged_OnlyHeightRewritten', () => {
      render(<AppViewport />);
      document.documentElement.style.removeProperty('--app-viewport-top');
      vv.height = 384;
      fire('resize');
      expect(cssVar('--app-viewport-height')).toBe('384px');
      expect(cssVar('--app-viewport-top')).toBe('');
    });
  });

  describe('CleanupFlow', () => {
    it('Unmount_RemovesListenersAndCssVariables', () => {
      const { unmount } = render(<AppViewport />);
      unmount();
      expect(vv.removeEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
      expect(vv.removeEventListener).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function)
      );
      expect(cssVar('--app-viewport-height')).toBe('');
      expect(cssVar('--app-viewport-top')).toBe('');
    });
  });
});
