import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import StoreFilterPopover from '../StoreFilterPopover';

type Props = React.ComponentProps<typeof StoreFilterPopover>;

function renderPopover(overrides: Partial<Props> = {}) {
  const onToggle = overrides.onToggle ?? vi.fn();
  const onClear = overrides.onClear ?? vi.fn();
  const props: Props = {
    storeOptions: overrides.storeOptions ?? ['Amazon', 'Target', 'Etsy'],
    selectedStores: overrides.selectedStores ?? [],
    onToggle,
    onClear,
  };
  const utils = render(<StoreFilterPopover {...props} />);
  return { ...utils, onToggle, onClear };
}

const trigger = () => screen.getByRole('button', { name: /stores/i });
const panel = () => screen.queryByRole('dialog', { name: 'Filter by store' });

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  return screen.getByRole('dialog', { name: 'Filter by store' });
}

describe('StoreFilterPopover', () => {
  describe('Trigger', () => {
    it('NoStores_NoBadgeNotActive', () => {
      renderPopover({ selectedStores: [] });
      // Exact accessible name "Stores" proves no count badge text is rendered.
      const btn = screen.getByRole('button', { name: 'Stores' });
      expect(btn).not.toHaveClass('active');
    });

    it('SelectedStores_CountBadgeAndActive', () => {
      renderPopover({ selectedStores: ['Amazon', 'Target'] });
      expect(trigger()).toHaveClass('active');
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('Click_TogglesPanelAndAriaExpanded', async () => {
      const user = userEvent.setup();
      renderPopover();
      expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
      expect(panel()).not.toBeInTheDocument();

      await user.click(trigger());
      expect(trigger()).toHaveAttribute('aria-expanded', 'true');
      expect(panel()).toBeInTheDocument();

      await user.click(trigger());
      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
      expect(panel()).not.toBeInTheDocument();
    });
  });

  describe('Search', () => {
    it('EmptyQuery_RendersAllOptions', async () => {
      const user = userEvent.setup();
      renderPopover();
      await openPanel(user);
      for (const name of ['Amazon', 'Target', 'Etsy']) {
        expect(screen.getByRole('checkbox', { name })).toBeInTheDocument();
      }
    });

    it('Query_NarrowsCaseInsensitiveSubstring', async () => {
      const user = userEvent.setup();
      const { onToggle, onClear } = renderPopover();
      await openPanel(user);
      await user.type(screen.getByRole('searchbox'), 'a');

      expect(screen.getByRole('checkbox', { name: 'Amazon' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Target' })).toBeInTheDocument();
      expect(screen.queryByRole('checkbox', { name: 'Etsy' })).not.toBeInTheDocument();
      expect(onToggle).not.toHaveBeenCalled();
      expect(onClear).not.toHaveBeenCalled();
    });

    it('WhitespaceQuery_TreatedAsEmpty', async () => {
      const user = userEvent.setup();
      renderPopover();
      await openPanel(user);
      await user.type(screen.getByRole('searchbox'), '   ');
      for (const name of ['Amazon', 'Target', 'Etsy']) {
        expect(screen.getByRole('checkbox', { name })).toBeInTheDocument();
      }
    });

    it('SearchClearButton_ResetsQueryAndRestoresOptions', async () => {
      const user = userEvent.setup();
      renderPopover();
      await openPanel(user);
      await user.type(screen.getByRole('searchbox'), 'amazon');
      expect(screen.queryByRole('checkbox', { name: 'Etsy' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Clear search' }));
      expect(screen.getByRole('searchbox')).toHaveValue('');
      for (const name of ['Amazon', 'Target', 'Etsy']) {
        expect(screen.getByRole('checkbox', { name })).toBeInTheDocument();
      }
    });
  });

  describe('EmptyState', () => {
    it('NoMatches_ShowsNoMatchingStores', async () => {
      const user = userEvent.setup();
      renderPopover();
      await openPanel(user);
      await user.type(screen.getByRole('searchbox'), 'zzz');

      expect(screen.getByText('No matching stores')).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('HasMatch_SuppressesEmptyState', async () => {
      const user = userEvent.setup();
      renderPopover();
      await openPanel(user);
      await user.type(screen.getByRole('searchbox'), 'a');
      expect(screen.queryByText('No matching stores')).not.toBeInTheDocument();
    });
  });

  describe('Options', () => {
    it('CheckedState_MirrorsSelectedStores', async () => {
      const user = userEvent.setup();
      renderPopover({ selectedStores: ['Amazon'] });
      await openPanel(user);
      expect(screen.getByRole('checkbox', { name: 'Amazon' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Target' })).not.toBeChecked();
    });

    it('Toggle_CallsOnToggleWithName-NoSelfMutation', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      const { rerender } = render(
        <StoreFilterPopover
          storeOptions={['Amazon', 'Target']}
          selectedStores={[]}
          onToggle={onToggle}
          onClear={vi.fn()}
        />
      );
      await openPanel(user);
      await user.click(screen.getByRole('checkbox', { name: 'Target' }));

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith('Target');
      // Controlled: the component does not mutate selection itself.
      expect(screen.getByRole('checkbox', { name: 'Target' })).not.toBeChecked();

      // Parent feeds the updated selection back; only then does it render checked.
      rerender(
        <StoreFilterPopover
          storeOptions={['Amazon', 'Target']}
          selectedStores={['Target']}
          onToggle={onToggle}
          onClear={vi.fn()}
        />
      );
      expect(screen.getByRole('checkbox', { name: 'Target' })).toBeChecked();
    });
  });

  describe('Footer', () => {
    it('ClearDisabled_WhenNoSelection', async () => {
      const user = userEvent.setup();
      renderPopover({ selectedStores: [] });
      await openPanel(user);
      expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    });

    it('Clear_CallsOnClearAndKeepsPanelOpen', async () => {
      const user = userEvent.setup();
      const { onClear } = renderPopover({ selectedStores: ['Amazon'] });
      await openPanel(user);
      await user.click(screen.getByRole('button', { name: 'Clear' }));

      expect(onClear).toHaveBeenCalledTimes(1);
      expect(panel()).toBeInTheDocument();
    });

    it('Done_ClosesWithoutMutatingSelection', async () => {
      const user = userEvent.setup();
      const { onClear, onToggle } = renderPopover({ selectedStores: ['Amazon'] });
      await openPanel(user);
      await user.click(screen.getByRole('button', { name: 'Done' }));

      expect(panel()).not.toBeInTheDocument();
      expect(onClear).not.toHaveBeenCalled();
      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe('Dismiss', () => {
    it('OutsideClick_ClosesOpenPanel', async () => {
      const user = userEvent.setup();
      renderPopover();
      await openPanel(user);
      fireEvent.mouseDown(document.body);
      expect(panel()).not.toBeInTheDocument();
    });

    it('Escape_ClosesOpenPanel', async () => {
      const user = userEvent.setup();
      renderPopover();
      await openPanel(user);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(panel()).not.toBeInTheDocument();
    });
  });
});
