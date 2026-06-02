import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ListSelection } from '../ListSelection';

const OPTIONS = [
  { value: '1', label: 'Birthday' },
  { value: '2', label: 'Wedding' },
];

function setupSel(
  overrides: Partial<React.ComponentProps<typeof ListSelection>> = {}
) {
  const onChange = overrides.onChange ?? vi.fn();
  render(
    <ListSelection
      name="lists"
      options={overrides.options ?? OPTIONS}
      onChange={onChange}
      defaultValue={overrides.defaultValue}
      error={overrides.error}
      isPending={overrides.isPending}
      placeholder={overrides.placeholder}
    />
  );
  return onChange;
}

const trigger = () => screen.getByRole('button', { name: /list/i });

describe('ListSelection', () => {
  it('NoDefault_TriggerShowsPlaceholder', () => {
    setupSel({ placeholder: 'Select a list' });
    expect(screen.getByText('Select a list')).toBeInTheDocument();
  });

  it('DefaultValueArray_RendersSelectedChips-TriggerSaysAddAnother', () => {
    setupSel({ defaultValue: [{ value: '1', label: 'Birthday' }] });
    expect(screen.getByText('Birthday')).toBeInTheDocument();
    expect(screen.getByText('Add another list…')).toBeInTheDocument();
  });

  it('DefaultValueSingleObject_RendersOneChip', () => {
    setupSel({ defaultValue: { value: '2', label: 'Wedding' } });
    expect(screen.getByText('Wedding')).toBeInTheDocument();
  });

  it('OpenAndSelect_CallsOnChange-AddsChip', async () => {
    const user = userEvent.setup();
    const onChange = setupSel();
    await user.click(trigger());
    await user.click(screen.getByRole('option', { name: 'Birthday' }));
    expect(onChange).toHaveBeenCalledWith([{ value: '1', label: 'Birthday' }]);
    expect(screen.getByText('Birthday')).toBeInTheDocument();
  });

  it('RemoveChip_CallsOnChangeWithRemainder', async () => {
    const user = userEvent.setup();
    const onChange = setupSel({
      defaultValue: [
        { value: '1', label: 'Birthday' },
        { value: '2', label: 'Wedding' },
      ],
    });
    await user.click(screen.getByRole('button', { name: 'Remove Birthday' }));
    expect(onChange).toHaveBeenCalledWith([{ value: '2', label: 'Wedding' }]);
  });

  it('AllSelected_MenuShowsAllSelectedEmptyState', async () => {
    const user = userEvent.setup();
    setupSel({
      defaultValue: [
        { value: '1', label: 'Birthday' },
        { value: '2', label: 'Wedding' },
      ],
    });
    await user.click(trigger());
    expect(screen.getByText('All lists selected')).toBeInTheDocument();
  });

  it('SelectedOption_DroppedFromAvailableList', async () => {
    const user = userEvent.setup();
    const onChange = setupSel();
    await user.click(trigger());
    await user.click(screen.getByRole('option', { name: 'Wedding' }));
    // re-open: the already-selected option is filtered out of the menu, so it
    // cannot be added a second time.
    await user.click(trigger());
    expect(
      screen.queryByRole('option', { name: 'Wedding' })
    ).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('EscapeWhileOpen_DismissesMenu', async () => {
    const user = userEvent.setup();
    setupSel();
    await user.click(trigger());
    expect(screen.getByRole('option', { name: 'Birthday' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(
      screen.queryByRole('option', { name: 'Birthday' })
    ).not.toBeInTheDocument();
  });

  it('Error_RendersFieldError-TriggerAriaInvalid', () => {
    setupSel({ error: 'Pick at least one list' });
    expect(screen.getByText('Pick at least one list')).toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-invalid', 'true');
  });
});
