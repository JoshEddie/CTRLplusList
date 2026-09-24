/* eslint-disable testing-library/no-node-access --
 * The Visibility rows expose their label in a nested `.menu-item-radio__label`
 * span; the row's own accessible name concatenates label and description, so
 * the span query is the only path to the label alone.
 */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setListVisibility } from '@/lib/data/list.actions';
import { VISIBILITY } from '@/lib/visibility';
import toast from 'react-hot-toast';
import type { ActionResponse } from '@/lib/types';
import { deferred } from '@/test/helpers/deferred';
import VisibilityMenuItems from '../VisibilityMenuItems';
import { renderInMenu } from './test-helpers';

vi.mock('@/lib/data/list.actions', () => ({
  setListVisibility: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('VisibilityMenuItems', () => {
  const row = (label: string) =>
    screen.getByRole('menuitemradio', { name: new RegExp(`^${label}`) });

  it('BelowTheOwnerFloor_RendersEveryRowDisabledAndWritesNothing', async () => {
    const user = userEvent.setup();
    renderInMenu(
      <VisibilityMenuItems
        listId="list-1"
        initialVisibility={VISIBILITY.OWNER}
        disabled
      />
    );

    for (const el of screen.getAllByRole('menuitemradio')) {
      expect(el).toHaveAttribute('aria-disabled', 'true');
    }
    await user.click(row('Shared'));
    expect(setListVisibility).not.toHaveBeenCalled();
  });

  it('Default_RendersThreeRadioRowsInSourceOrder', () => {
    renderInMenu(
      <VisibilityMenuItems
        listId="list-1"
        initialVisibility={VISIBILITY.OWNER}
        disabled={false}
      />
    );
    const labels = screen
      .getAllByRole('menuitemradio')
      .map((el) => el.querySelector('.menu-item-radio__label')?.textContent);
    expect(labels).toEqual(['Hidden', 'Private', 'Shared']);
  });

  it('InitialVisibility_ChecksMatchingRowOnly', () => {
    renderInMenu(
      <VisibilityMenuItems
        listId="list-1"
        initialVisibility={VISIBILITY.LINK}
        disabled={false}
      />
    );
    expect(row('Private')).toHaveAttribute('aria-checked', 'true');
    expect(row('Hidden')).toHaveAttribute('aria-checked', 'false');
    expect(row('Shared')).toHaveAttribute('aria-checked', 'false');
  });

  it('SelectRow_OptimisticallyChecks-CallsSetListVisibility-ToastsRowCopy', async () => {
    vi.mocked(setListVisibility).mockResolvedValue({
      success: true,
      message: '',
    });
    const user = userEvent.setup();
    renderInMenu(
      <VisibilityMenuItems
        listId="list-1"
        initialVisibility={VISIBILITY.OWNER}
        disabled={false}
      />
    );
    await user.click(row('Private'));
    expect(row('Private')).toHaveAttribute('aria-checked', 'true');
    expect(setListVisibility).toHaveBeenCalledWith('list-1', VISIBILITY.LINK);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Only people with the link can view'
      )
    );
  });

  it('SelectRowFailure_RevertsChecked-ToastsError', async () => {
    vi.mocked(setListVisibility).mockResolvedValue({
      success: false,
      message: 'Nope',
    });
    const user = userEvent.setup();
    renderInMenu(
      <VisibilityMenuItems
        listId="list-1"
        initialVisibility={VISIBILITY.OWNER}
        disabled={false}
      />
    );
    await user.click(row('Private'));
    await waitFor(() =>
      expect(row('Hidden')).toHaveAttribute('aria-checked', 'true')
    );
    expect(toast.error).toHaveBeenCalledWith('Nope');
  });

  it('SelectAlreadyCheckedRow_IsNoOp', async () => {
    const user = userEvent.setup();
    renderInMenu(
      <VisibilityMenuItems
        listId="list-1"
        initialVisibility={VISIBILITY.OWNER}
        disabled={false}
      />
    );
    await user.click(row('Hidden'));
    expect(setListVisibility).not.toHaveBeenCalled();
  });

  it('PendingTransition_RowsDisabled', async () => {
    const d = deferred<ActionResponse>();
    vi.mocked(setListVisibility).mockReturnValue(d.promise);
    const user = userEvent.setup();
    renderInMenu(
      <VisibilityMenuItems
        listId="list-1"
        initialVisibility={VISIBILITY.OWNER}
        disabled={false}
      />
    );
    await user.click(row('Private'));
    await waitFor(() =>
      expect(row('Hidden')).toHaveAttribute('aria-disabled', 'true')
    );
    expect(row('Private')).toHaveAttribute('aria-disabled', 'true');
    expect(row('Shared')).toHaveAttribute('aria-disabled', 'true');
    d.resolve({ success: true, message: '' });
  });
});
