import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FETCHING_MESSAGES, FetchingStep } from '../FetchingStep';

const CYCLE_MS = 2500;
const FADE_MS = 200;

function renderStep(
  handlers: { onChangeUrl?: () => void; onCancel?: () => void } = {}
) {
  const onChangeUrl = handlers.onChangeUrl ?? vi.fn();
  const onCancel = handlers.onCancel ?? vi.fn();
  render(
    <FetchingStep
      url="https://www.amazon.com/dp/B0TEST"
      onChangeUrl={onChangeUrl}
      onCancel={onCancel}
    />
  );
  return { onChangeUrl, onCancel };
}

describe('FetchingStep', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('InitialRender_ShowsFirstMessage-Url', () => {
    renderStep();
    expect(screen.getByText(FETCHING_MESSAGES[0])).not.toHaveClass(
      'prefill-cycling-msg-faded'
    );
    expect(
      screen.getByText('https://www.amazon.com/dp/B0TEST')
    ).toBeInTheDocument();
  });

  it('CycleInterval_FadesOutWhileMessageHolds', () => {
    renderStep();
    act(() => vi.advanceTimersByTime(CYCLE_MS));
    expect(screen.getByText(FETCHING_MESSAGES[0])).toHaveClass(
      'prefill-cycling-msg-faded'
    );
  });

  it('AfterFadeDelay_AdvancesToSecondMessage-Unfades', () => {
    renderStep();
    act(() => vi.advanceTimersByTime(CYCLE_MS + FADE_MS));
    expect(screen.getByText(FETCHING_MESSAGES[1])).not.toHaveClass(
      'prefill-cycling-msg-faded'
    );
  });

  it('FullCycleCount_WrapsBackToFirstMessage', () => {
    renderStep();
    for (let i = 0; i < FETCHING_MESSAGES.length; i++) {
      act(() => vi.advanceTimersByTime(CYCLE_MS + FADE_MS));
    }
    expect(screen.getByText(FETCHING_MESSAGES[0])).toBeInTheDocument();
  });

  it('ClickChange_CallsOnChangeUrl', () => {
    const onChangeUrl = vi.fn();
    renderStep({ onChangeUrl });
    fireEvent.click(screen.getByRole('button', { name: 'change' }));
    expect(onChangeUrl).toHaveBeenCalledTimes(1);
  });

  it('ClickCancel_CallsOnCancel', () => {
    const onCancel = vi.fn();
    renderStep({ onCancel });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
