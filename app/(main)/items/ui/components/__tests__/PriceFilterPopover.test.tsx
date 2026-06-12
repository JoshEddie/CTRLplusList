import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PriceFilterPopover from '../PriceFilterPopover';

// `PriceField` (form-field-system) uses cents-as-integer math: its onChange
// strips non-digits, parses the rest as integer cents, and emits cents / 100.
// So firing a change with the digit string "5000" produces the value 50.00 and
// the popover commits the string "50.00". Tests drive inputs with digit strings
// and assert on the resulting display / onApply arguments. See design Decision 3.
const typePrice = (input: HTMLInputElement, digits: string) =>
  fireEvent.change(input, { target: { value: digits } });

const trigger = () => screen.getByRole('button', { name: /Price/ });
const openPanel = () => fireEvent.click(trigger());
const minInput = () => screen.getByLabelText('Min') as HTMLInputElement;
const maxInput = () => screen.getByLabelText('Max') as HTMLInputElement;
const panel = () =>
  screen.queryByRole('dialog', { name: 'Filter by price' });
// The inline error copy is one of the two field-naming strings; a text query
// stands in for "is any FieldError surfaced" without reaching into the DOM.
const fieldError = () => screen.queryByText(/must be at (most|least)/);
// The PopoverTrigger count badge is a span whose text is the active-bound count.
const countBadge = () => within(trigger()).queryByText(/^\d+$/);
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function renderPopover(
  props: Partial<{
    min: string;
    max: string;
    onApply: (min: string, max: string) => void;
    onClear: () => void;
  }> = {}
) {
  const onApply = props.onApply ?? vi.fn();
  const onClear = props.onClear ?? vi.fn();
  const utils = render(
    <PriceFilterPopover
      min={props.min ?? ''}
      max={props.max ?? ''}
      onApply={onApply}
      onClear={onClear}
    />
  );
  return { ...utils, onApply, onClear };
}

describe('PriceFilterPopover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Trigger', () => {
    it('NoBounds_RendersNoCountBadge-NotActive', () => {
      renderPopover({ min: '', max: '' });
      expect(countBadge()).toBeNull();
      expect(trigger()).not.toHaveClass('active');
    });

    it('OneBound_RendersCountOne-Active', () => {
      renderPopover({ min: '10', max: '' });
      expect(countBadge()).toHaveTextContent('1');
      expect(trigger()).toHaveClass('active');
    });

    it('TwoBounds_RendersCountTwo', () => {
      renderPopover({ min: '10', max: '50' });
      expect(countBadge()).toHaveTextContent('2');
    });

    it('Closed_ClickOpensPanel-AriaExpandedTrue', () => {
      renderPopover();
      expect(panel()).toBeNull();
      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
      openPanel();
      expect(panel()).toBeInTheDocument();
      expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    });

    it('Open_ClickClosesPanel', () => {
      renderPopover();
      openPanel();
      expect(panel()).toBeInTheDocument();
      openPanel();
      expect(panel()).toBeNull();
    });
  });

  describe('Autofocus', () => {
    it('Open_FocusesMinInput-NotMaxInput', () => {
      renderPopover();
      openPanel();
      expect(minInput()).toHaveFocus();
      expect(maxInput()).not.toHaveFocus();
    });
  });

  describe('DebounceCommit', () => {
    it('TypingBurst_CommitsFinalValueOnceAfterDebounce', () => {
      const { onApply } = renderPopover();
      openPanel();
      typePrice(maxInput(), '1');
      advance(100);
      typePrice(maxInput(), '19');
      advance(100);
      typePrice(maxInput(), '19999');
      expect(onApply).not.toHaveBeenCalled();
      advance(400);
      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledWith('', '199.99');
    });

    it('SubDebounceWindow_DoesNotCommit', () => {
      const { onApply } = renderPopover();
      openPanel();
      typePrice(maxInput(), '5000');
      advance(200);
      expect(onApply).not.toHaveBeenCalled();
    });

    it('PauseBetweenEdits_CommitsIntermediateThenFinal', () => {
      const { onApply } = renderPopover();
      openPanel();
      typePrice(maxInput(), '100');
      advance(400);
      expect(onApply).toHaveBeenNthCalledWith(1, '', '1.00');
      typePrice(maxInput(), '19999');
      advance(400);
      expect(onApply).toHaveBeenNthCalledWith(2, '', '199.99');
      expect(onApply).toHaveBeenCalledTimes(2);
    });

    it('UnchangedFromProps_NeverCommits', () => {
      const { onApply } = renderPopover({ min: '10', max: '50' });
      openPanel();
      advance(500);
      expect(onApply).not.toHaveBeenCalled();
    });
  });

  describe('Footer', () => {
    it('Open_HasClearAndDoneOnly-NoApply', () => {
      renderPopover();
      openPanel();
      const clear = screen.getByRole('button', { name: 'Clear' });
      const done = screen.getByRole('button', { name: 'Done' });
      expect(clear).toHaveClass('ghost');
      expect(done).toHaveClass('primary');
      expect(
        screen.queryByRole('button', { name: /apply/i })
      ).toBeNull();
    });
  });

  describe('InvertedPairError', () => {
    it('LowerMaxBelowMin_ErrorUnderMaxAfterDebounce-NoCommit', () => {
      const { onApply } = renderPopover({ min: '100', max: '' });
      openPanel();
      typePrice(maxInput(), '5000'); // 50.00 < 100
      advance(400);
      const err = screen.getByText('Max must be at least Min');
      expect(err).toHaveClass('field_error');
      expect(maxInput()).toHaveAttribute('aria-invalid', 'true');
      expect(maxInput().getAttribute('aria-describedby')).toBe(err.id);
      expect(minInput()).not.toHaveAttribute('aria-invalid');
      expect(onApply).not.toHaveBeenCalled();
    });

    it('RaiseMinAboveMax_ErrorUnderMin', () => {
      const { onApply } = renderPopover({ min: '', max: '50' });
      openPanel();
      typePrice(minInput(), '10000'); // 100.00 > 50
      advance(400);
      const err = screen.getByText('Min must be at most Max');
      expect(err).toHaveClass('field_error');
      expect(minInput()).toHaveAttribute('aria-invalid', 'true');
      expect(minInput().getAttribute('aria-describedby')).toBe(err.id);
      expect(maxInput()).not.toHaveAttribute('aria-invalid');
      expect(onApply).not.toHaveBeenCalled();
    });

    it('MidTyping_NoErrorBeforeDebounce', () => {
      renderPopover({ min: '100', max: '' });
      openPanel();
      typePrice(maxInput(), '5000'); // inverted, but timer not fired
      advance(200);
      expect(fieldError()).toBeNull();
    });

    it('LiveClearThenReBreak_RequiresFreshDebounceFire', () => {
      renderPopover({ min: '100', max: '' });
      openPanel();
      typePrice(maxInput(), '5000'); // 50 < 100
      advance(400);
      expect(fieldError()).not.toBeNull();
      typePrice(maxInput(), '50000'); // 500 >= 100 -> valid, error clears live
      expect(fieldError()).toBeNull();
      typePrice(maxInput(), '5000'); // re-break: 50 < 100
      expect(fieldError()).toBeNull(); // not on the breaking keystroke
      advance(400);
      expect(fieldError()).not.toBeNull(); // only after a fresh fire
    });

    it('SubsequentEditKeepsInverted_ErrorMovesToOtherInput', () => {
      renderPopover({ min: '100', max: '' });
      openPanel();
      typePrice(maxInput(), '5000'); // 50 < 100, lastEdited = max
      advance(400);
      expect(screen.getByText('Max must be at least Min')).toBeInTheDocument();
      typePrice(minInput(), '20000'); // 200, still inverted (50 < 200)
      expect(screen.getByText('Min must be at most Max')).toBeInTheDocument();
      expect(screen.queryByText('Max must be at least Min')).toBeNull();
    });

    it('EqualBounds_NoError-Commits', () => {
      const { onApply } = renderPopover();
      openPanel();
      typePrice(minInput(), '2000'); // 20.00
      typePrice(maxInput(), '2000'); // 20.00
      advance(400);
      expect(fieldError()).toBeNull();
      expect(onApply).toHaveBeenCalledWith('20.00', '20.00');
    });

    it('FieldEmptied_ErrorClearsImmediately-CommitsRemainingBound', () => {
      const { onApply } = renderPopover();
      openPanel();
      typePrice(minInput(), '10000'); // 100
      typePrice(maxInput(), '5000'); // 50 < 100
      advance(400);
      expect(fieldError()).not.toBeNull();
      typePrice(maxInput(), ''); // clear max
      expect(fieldError()).toBeNull();
      advance(400);
      expect(onApply).toHaveBeenLastCalledWith('100.00', '');
    });

    it('PairBecomesValid_ErrorClearsImmediately-CommitsBoth', () => {
      const { onApply } = renderPopover();
      openPanel();
      typePrice(minInput(), '10000'); // 100
      typePrice(maxInput(), '5000'); // 50 < 100
      advance(400);
      expect(fieldError()).not.toBeNull();
      typePrice(maxInput(), '50000'); // 500 -> valid
      expect(fieldError()).toBeNull();
      advance(400);
      expect(onApply).toHaveBeenLastCalledWith('100.00', '500.00');
    });

    it('ErrorState_UsesFieldErrorPrimitive-NoAlertRole', () => {
      renderPopover({ min: '100', max: '' });
      openPanel();
      typePrice(maxInput(), '5000');
      advance(400);
      const err = screen.getByText('Max must be at least Min');
      expect(err.tagName).toBe('P');
      expect(err).toHaveClass('field_error');
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  describe('NeverCommitInvalid', () => {
    const closeVia: Record<string, () => void> = {
      done: () => fireEvent.click(screen.getByRole('button', { name: 'Done' })),
      outsideMousedown: () =>
        act(() => {
          document.body.dispatchEvent(
            new MouseEvent('mousedown', { bubbles: true })
          );
        }),
      escape: () =>
        act(() => {
          document.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape' })
          );
        }),
    };

    for (const method of ['done', 'outsideMousedown', 'escape']) {
      it(`InvalidLocalState_CloseVia${cap(method)}-DoesNotCommit`, () => {
        const { onApply } = renderPopover({ min: '10', max: '50' });
        openPanel();
        typePrice(maxInput(), '500'); // 5.00 < 10 -> invalid
        closeVia[method]();
        advance(400);
        expect(onApply).not.toHaveBeenCalled();
        expect(countBadge()).toHaveTextContent('2'); // prior URL state intact
      });
    }

    it('InvalidThenClose_ReopenStartsFromUrlValues', () => {
      renderPopover({ min: '10', max: '50' });
      openPanel();
      typePrice(maxInput(), '500'); // 5.00 invalid
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(panel()).toBeNull();
      openPanel();
      expect(minInput().value).toBe('10.00');
      expect(maxInput().value).toBe('50.00');
      expect(fieldError()).toBeNull();
    });
  });

  describe('Done', () => {
    it('ValidPendingEdit_FlushesOnce', () => {
      const { onApply } = renderPopover();
      openPanel();
      typePrice(maxInput(), '5000'); // 50.00, valid, debounce not fired
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledWith('', '50.00');
      expect(panel()).toBeNull();
    });

    it('NoDivergence_CommitsNothing', () => {
      const { onApply, onClear } = renderPopover({ min: '10', max: '50' });
      openPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(onApply).not.toHaveBeenCalled();
      expect(onClear).not.toHaveBeenCalled();
      expect(panel()).toBeNull();
    });
  });

  describe('ExternalChange', () => {
    it('PropsChangeWhileOpen_RemountsPanelToNewProps-ClearsError', () => {
      const onApply = vi.fn();
      const onClear = vi.fn();
      const { rerender } = render(
        <PriceFilterPopover
          min="10"
          max="50"
          onApply={onApply}
          onClear={onClear}
        />
      );
      openPanel();
      typePrice(maxInput(), '500'); // 5.00 < 10 -> inverted
      advance(400);
      expect(fieldError()).not.toBeNull();

      rerender(
        <PriceFilterPopover
          min=""
          max=""
          onApply={onApply}
          onClear={onClear}
        />
      );
      expect(minInput().value).toBe('');
      expect(maxInput().value).toBe('');
      expect(fieldError()).toBeNull();
    });
  });

  describe('Clear', () => {
    it('FilterApplied_EmptiesInputs-CallsOnClear', () => {
      const { onClear } = renderPopover({ min: '10', max: '50' });
      openPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
      expect(onClear).toHaveBeenCalledTimes(1);
      expect(minInput().value).toBe('');
      expect(maxInput().value).toBe('');
    });

    it('NothingToClear_Disabled', () => {
      renderPopover({ min: '', max: '' });
      openPanel();
      expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    });

    it('LocalEditOnly_Enabled', () => {
      renderPopover({ min: '', max: '' });
      openPanel();
      expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
      typePrice(minInput(), '10000');
      expect(screen.getByRole('button', { name: 'Clear' })).toBeEnabled();
    });
  });

  describe('ZeroBound', () => {
    it('ZeroMin_CommitsNoLowerBound', () => {
      const { onApply } = renderPopover();
      openPanel();
      typePrice(maxInput(), '5000'); // 50.00
      typePrice(minInput(), '0'); // resolves to 0 -> empty bound
      advance(400);
      expect(minInput().value).toBe('');
      expect(onApply).toHaveBeenLastCalledWith('', '50.00');
      expect(fieldError()).toBeNull();
    });

    it('FieldReducedToZero_ClearsBound-CommitsRemaining', () => {
      const { onApply } = renderPopover();
      openPanel();
      typePrice(minInput(), '1000'); // 10.00
      typePrice(maxInput(), '5000'); // 50.00
      advance(400);
      expect(onApply).toHaveBeenLastCalledWith('10.00', '50.00');
      typePrice(maxInput(), '0'); // resolves to 0 -> empty
      expect(maxInput().value).toBe('');
      advance(400);
      expect(onApply).toHaveBeenLastCalledWith('10.00', '');
    });
  });

  describe('NonNumericProp', () => {
    it('NonNumericMin_RendersEmptyInput-NoError', () => {
      renderPopover({ min: 'abc', max: '50' });
      openPanel();
      expect(minInput().value).toBe('');
      expect(maxInput().value).toBe('50.00');
      expect(fieldError()).toBeNull();
    });
  });
});
