import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditModeFooter from '../EditModeFooter';

const onCancel = vi.fn();
const onSave = vi.fn();

function renderFooter(
  overrides: Partial<React.ComponentProps<typeof EditModeFooter>> = {}
) {
  return render(
    <EditModeFooter
      totalSelected={3}
      added={0}
      removed={0}
      isNew={false}
      canSave={false}
      isSubmitting={false}
      onCancel={onCancel}
      onSave={onSave}
      {...overrides}
    />
  );
}

beforeEach(() => vi.clearAllMocks());

describe('EditModeFooter', () => {
  describe('Count', () => {
    it('SelectionOfThree_ShowsPluralSelectedCount', () => {
      renderFooter();
      expect(screen.getByText('3 items')).toBeInTheDocument();
    });

    it('SelectionOfOne_ShowsSingularSelectedCount', () => {
      renderFooter({ totalSelected: 1 });
      expect(screen.getByText('1 item')).toBeInTheDocument();
    });

    it('EmptySelection_ShowsNoItemsSelected', () => {
      renderFooter({ totalSelected: 0 });
      expect(screen.getByText('No items selected')).toBeInTheDocument();
    });
  });

  describe('Diff', () => {
    it('AddedAndRemoved_ShowsBothCounts', () => {
      renderFooter({ added: 2, removed: 1, canSave: true });
      expect(screen.getByText('+2 added')).toBeInTheDocument();
      expect(screen.getByText('−1 removed')).toBeInTheDocument();
    });

    it('NoEntryChanges_ShowsNeitherCount', () => {
      renderFooter({ canSave: true });
      expect(screen.queryByText(/added/)).not.toBeInTheDocument();
      expect(screen.queryByText(/removed/)).not.toBeInTheDocument();
    });

    it('CreateMode_SuppressesDiffLine', () => {
      renderFooter({ isNew: true, added: 2, removed: 1, canSave: true });
      expect(screen.queryByText('+2 added')).not.toBeInTheDocument();
    });

    it('Render_OffersNoBulkUndo', () => {
      renderFooter({ added: 2, removed: 1, canSave: true });
      expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    });
  });

  describe('Actions', () => {
    it('SaveBlocked_SaveDisabled', () => {
      renderFooter();
      expect(screen.getByRole('button', { name: /Save/ })).toBeDisabled();
    });

    it('SaveAllowed_SaveEnabled', () => {
      renderFooter({ canSave: true });
      expect(screen.getByRole('button', { name: /Save/ })).toBeEnabled();
    });

    it('ClickSave_InvokesOnSave', async () => {
      const user = userEvent.setup();
      renderFooter({ canSave: true });
      await user.click(screen.getByRole('button', { name: /Save/ }));
      expect(onSave).toHaveBeenCalled();
    });

    it('ClickCancel_InvokesOnCancel', async () => {
      const user = userEvent.setup();
      renderFooter();
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onCancel).toHaveBeenCalled();
    });

    it('Submitting_DisablesCancel', () => {
      renderFooter({ canSave: true, isSubmitting: true });
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });
  });

  describe('CreateMode', () => {
    it('NewWithSelection_LabelsSaveAsAddCount-CancelAsSkip', () => {
      renderFooter({ isNew: true, totalSelected: 2 });
      expect(
        screen.getByRole('button', { name: /Add 2 items/ })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    });

    it('NewWithOneSelection_LabelsSaveAsSingularAddCount', () => {
      renderFooter({ isNew: true, totalSelected: 1 });
      expect(
        screen.getByRole('button', { name: /Add 1 item/ })
      ).toBeInTheDocument();
    });

    it('NewWithEmptySelection_LabelsSaveAsSkipAndKeepsItEnabled', () => {
      renderFooter({ isNew: true, totalSelected: 0, canSave: true });
      const buttons = screen.getAllByRole('button', { name: /Skip/ });
      expect(buttons[buttons.length - 1]).toBeEnabled();
    });
  });
});
