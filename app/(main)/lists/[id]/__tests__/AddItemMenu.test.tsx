import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AddItemMenu from '../AddItemMenu';

function renderMenu() {
  const onCreate = vi.fn();
  const onChooseExisting = vi.fn();
  render(
    <AddItemMenu onCreate={onCreate} onChooseExisting={onChooseExisting} />
  );
  return { onCreate, onChooseExisting };
}

const trigger = () => screen.getByRole('button', { name: 'Add item' });

describe('AddItemMenu', () => {
  it('Default_RendersTriggerCollapsed-NoRowsUntilOpened', () => {
    renderMenu();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('menuitem', { name: 'Create a new item' })
    ).not.toBeInTheDocument();
  });

  it('OpenTrigger_OffersCreateNewAndChooseFromExisting', async () => {
    renderMenu();
    await userEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('menuitem', { name: 'Create a new item' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Choose from existing' })
    ).toBeInTheDocument();
  });

  it('Escape_ClosesMenuWithoutChoosing', async () => {
    const { onCreate, onChooseExisting } = renderMenu();
    await userEvent.click(trigger());
    await userEvent.keyboard('{Escape}');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(onCreate).not.toHaveBeenCalled();
    expect(onChooseExisting).not.toHaveBeenCalled();
  });

  it('ChooseCreateNew_CallsOnCreate-ClosesMenu', async () => {
    const { onCreate, onChooseExisting } = renderMenu();
    await userEvent.click(trigger());
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Create a new item' })
    );
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onChooseExisting).not.toHaveBeenCalled();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('ChooseFromExisting_CallsOnChooseExisting-ClosesMenu', async () => {
    const { onCreate, onChooseExisting } = renderMenu();
    await userEvent.click(trigger());
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Choose from existing' })
    );
    expect(onChooseExisting).toHaveBeenCalledTimes(1);
    expect(onCreate).not.toHaveBeenCalled();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });
});
