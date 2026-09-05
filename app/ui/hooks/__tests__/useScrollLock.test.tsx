import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SCROLL_LOCK_CLASS, useScrollLock } from '../useScrollLock';

const locked = () =>
  document.documentElement.classList.contains(SCROLL_LOCK_CLASS);

describe('useScrollLock', () => {
  afterEach(() => {
    document.documentElement.classList.remove(SCROLL_LOCK_CLASS);
  });

  it('Mounted_AddsHasOpenSheetClass', () => {
    renderHook(() => useScrollLock());
    expect(locked()).toBe(true);
  });

  it('Unmounted_RemovesHasOpenSheetClass', () => {
    const { unmount } = renderHook(() => useScrollLock());
    unmount();
    expect(locked()).toBe(false);
  });

  it('Inactive_LeavesHasOpenSheetClassOff', () => {
    renderHook(() => useScrollLock(false));
    expect(locked()).toBe(false);
  });

  it('ActiveTurnedOff_RemovesHasOpenSheetClass', () => {
    const { rerender } = renderHook(({ open }) => useScrollLock(open), {
      initialProps: { open: true },
    });
    rerender({ open: false });
    expect(locked()).toBe(false);
  });

  describe('NestedOverlays', () => {
    it('InnerUnmounted_KeepsHasOpenSheetClassForTheOuter', () => {
      renderHook(() => useScrollLock());
      const { unmount: unmountInner } = renderHook(() => useScrollLock());
      unmountInner();
      expect(locked()).toBe(true);
    });

    it('BothUnmounted_RemovesHasOpenSheetClass', () => {
      const { unmount: unmountOuter } = renderHook(() => useScrollLock());
      const { unmount: unmountInner } = renderHook(() => useScrollLock());
      unmountInner();
      unmountOuter();
      expect(locked()).toBe(false);
    });
  });
});
