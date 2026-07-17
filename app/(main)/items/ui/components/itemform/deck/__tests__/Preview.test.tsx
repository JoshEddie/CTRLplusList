import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Preview } from '../Preview';
import type { ItemViewModel } from '../viewModel';
import { makeItem, mockActions } from './test-helpers';

function vm(over: Partial<ItemViewModel> = {}): ItemViewModel {
  return makeItem(over);
}

function setup(
  over: Partial<ItemViewModel> = {},
  props: Partial<Parameters<typeof Preview>[0]> = {}
) {
  const actions = mockActions();
  const handlers = {
    onSubmit: vi.fn(),
    onOpenTriage: vi.fn(),
    onOpenStores: vi.fn(),
    onOpenLists: vi.fn(),
    onAddNote: vi.fn(),
  };
  render(
    <Preview
      item={vm(over)}
      actions={actions}
      isEditing={false}
      isPending={false}
      {...handlers}
      {...props}
    />
  );
  return { actions, ...handlers };
}

describe('Preview', () => {
  it('NewItem_PrimaryActionIsCreateItem', () => {
    setup();
    expect(
      screen.getByRole('button', { name: 'Create item' })
    ).toBeInTheDocument();
  });

  it('Editing_PrimaryActionIsSaveChanges', () => {
    setup({}, { isEditing: true });
    expect(
      screen.getByRole('button', { name: 'Save changes' })
    ).toBeInTheDocument();
  });

  it('TriageEntry_IsAccentInvitationNotAlarm', () => {
    setup();
    const row = screen.getByRole('button', {
      name: /Need to change something\?/,
    });
    expect(row.className).toContain('deck-actrow-accent');
    expect(screen.queryByText(/Something's off/)).not.toBeInTheDocument();
  });

  it('TriageEntrySub_ClaimsNoSystemAuthorship', () => {
    setup();
    expect(
      screen.getByText('Fix anything that looks wrong')
    ).toBeInTheDocument();
    expect(screen.queryByText(/we got wrong/)).not.toBeInTheDocument();
  });

  it('ClickTriageEntry_CallsOnOpenTriage', async () => {
    const user = userEvent.setup();
    const { onOpenTriage } = setup();
    await user.click(
      screen.getByRole('button', { name: /Need to change something\?/ })
    );
    expect(onOpenTriage).toHaveBeenCalledOnce();
  });

  it('DefaultQty_ListsRowShowsNotOnAListQtyOne', () => {
    setup();
    expect(screen.getByText('Not on a list · Qty 1')).toBeInTheDocument();
  });

  it('EmptyDescription_ShowsAddANoteRow', () => {
    setup();
    expect(
      screen.getByRole('button', { name: /Add a note/ })
    ).toBeInTheDocument();
  });

  it('WithDescription_HidesAddANoteRow', () => {
    setup({ description: 'A nice note' });
    expect(
      screen.queryByRole('button', { name: /Add a note/ })
    ).not.toBeInTheDocument();
  });

  it('WithDeleteSlot_RendersIt', () => {
    setup(
      {},
      {
        isEditing: true,
        deleteSlot: <button type="button">Delete</button>,
      }
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  describe('ErrorTitle', () => {
    it('OverMax_DisablesCreate-ShowsTrimAffordance', async () => {
      const user = userEvent.setup();
      const { actions } = setup({ name: 'a'.repeat(120) });
      expect(
        screen.getByRole('button', { name: 'Create item' })
      ).toBeDisabled();
      await user.click(screen.getByRole('button', { name: /Tap to use/ }));
      expect(actions.setName).toHaveBeenCalledWith('a'.repeat(50));
    });

    it('Empty_DisablesCreate-ShowsNeedsNameLine', () => {
      setup({ name: '' });
      expect(
        screen.getByRole('button', { name: 'Create item' })
      ).toBeDisabled();
      expect(screen.getByText('An item needs a name.')).toBeInTheDocument();
    });
  });

  describe('OverCapDescription', () => {
    it('GoodNameButLongDescription_DisablesCreate-ShowsTrimLine', () => {
      setup({ description: 'd'.repeat(150) });
      expect(
        screen.getByRole('button', { name: 'Create item' })
      ).toBeDisabled();
      expect(
        screen.getByText(/over the 100-character limit — trim it to save/)
      ).toBeInTheDocument();
    });
  });
});
