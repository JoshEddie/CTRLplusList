import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FetchFailure, type FailureKind } from '../FetchFailure';

function renderFailure(
  kind: FailureKind,
  canRetrySame: boolean,
  handlers?: Partial<{
    onRetrySame: () => void;
    onTryDifferent: () => void;
    onManual: () => void;
  }>
) {
  return render(
    <FetchFailure
      kind={kind}
      canRetrySame={canRetrySame}
      onRetrySame={handlers?.onRetrySame ?? vi.fn()}
      onTryDifferent={handlers?.onTryDifferent ?? vi.fn()}
      onManual={handlers?.onManual ?? vi.fn()}
    />
  );
}

describe('FetchFailure', () => {
  it('TimeoutKind_ShowsSlownessCopyWithAllThreeActions', () => {
    renderFailure('timeout', true);
    expect(
      screen.getByText('This is taking longer than expected')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The link may still work — a retry often does it/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try a different link' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Build it by hand' })
    ).toBeInTheDocument();
  });

  it('FailedKind_ShowsUncertaintyCopyWithAllThreeActions', () => {
    renderFailure('failed', true);
    expect(screen.getByText("We couldn't load that link")).toBeInTheDocument();
    expect(
      screen.getByText(/might be the link, or a hiccup on our end/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try a different link' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Build it by hand' })
    ).toBeInTheDocument();
  });

  it('RetryCapReached_WithdrawsTryAgainAndHardensCopy', () => {
    renderFailure('failed', false);
    expect(screen.getByText('That link keeps failing')).toBeInTheDocument();
    expect(
      screen.getByText(/Try a different one, or build it by hand/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Try again' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try a different link' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Build it by hand' })
    ).toBeInTheDocument();
  });

  it('TimeoutKindCapped_AlsoWithdrawsTryAgain', () => {
    renderFailure('timeout', false);
    expect(screen.getByText('That link keeps failing')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Try again' })
    ).not.toBeInTheDocument();
  });

  it('TryAgainClicked_InvokesRetrySameHandler', async () => {
    const onRetrySame = vi.fn();
    const user = userEvent.setup();
    renderFailure('failed', true, { onRetrySame });
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetrySame).toHaveBeenCalledOnce();
  });

  it('TryDifferentLinkClicked_InvokesTryDifferentHandler', async () => {
    const onTryDifferent = vi.fn();
    const user = userEvent.setup();
    renderFailure('failed', true, { onTryDifferent });
    await user.click(
      screen.getByRole('button', { name: 'Try a different link' })
    );
    expect(onTryDifferent).toHaveBeenCalledOnce();
  });

  it('BuildItByHandClicked_InvokesManualHandler', async () => {
    const onManual = vi.fn();
    const user = userEvent.setup();
    renderFailure('failed', true, { onManual });
    await user.click(screen.getByRole('button', { name: 'Build it by hand' }));
    expect(onManual).toHaveBeenCalledOnce();
  });
});
