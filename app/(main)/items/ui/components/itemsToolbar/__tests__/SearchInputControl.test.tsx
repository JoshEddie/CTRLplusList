import { act, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchInputControl } from '../SearchInputControl';

describe('SearchInputControl', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('TypingBurst_CommitsFinalValueOnceAfterDebounce', () => {
    const onCommit = vi.fn();
    render(<SearchInputControl initialQ="" onCommit={onCommit} />);
    const input = screen.getByRole('searchbox', { name: 'Search items' });

    fireEvent.change(input, { target: { value: 'gi' } });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.change(input, { target: { value: 'gift' } });
    expect(onCommit).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('gift');
  });

  it('SubDebounceWindow_DoesNotCommit', () => {
    const onCommit = vi.fn();
    render(<SearchInputControl initialQ="" onCommit={onCommit} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search items' }), {
      target: { value: 'abc' },
    });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('ValueUnchangedFromInitial_NeverCommits', () => {
    const onCommit = vi.fn();
    render(<SearchInputControl initialQ="seed" onCommit={onCommit} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('ClearButton_ResetsInputThenCommitsEmpty', () => {
    const onCommit = vi.fn();
    render(<SearchInputControl initialQ="gift" onCommit={onCommit} />);
    const input = screen.getByRole('searchbox', { name: 'Search items' });
    expect((input as HTMLInputElement).value).toBe('gift');

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect((input as HTMLInputElement).value).toBe('');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onCommit).toHaveBeenCalledWith('');
  });
});
