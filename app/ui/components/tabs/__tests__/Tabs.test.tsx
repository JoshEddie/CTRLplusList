import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Tabs } from '../Tabs';
import type { TabButtonItem } from '../types';

const BUTTONS: TabButtonItem<'active' | 'archived'>[] = [
  { label: 'Active', value: 'active', panelId: 'panel-active' },
  { label: 'Archived', value: 'archived', panelId: 'panel-archived' },
];

function mountButtons(
  value: 'active' | 'archived' = 'active',
  onChange = vi.fn()
) {
  render(
    <Tabs
      items={BUTTONS}
      value={value}
      onChange={onChange}
      aria-label="Filter"
    />
  );
  return onChange;
}

describe('Tabs', () => {
  it('Render_PlacesEveryTabInsideTheTablist', () => {
    mountButtons();

    const tablist = screen.getByRole('tablist', { name: 'Filter' });
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Active',
      'Archived',
    ]);
    expect(tablist).toContainElement(
      screen.getByRole('tab', { name: 'Active' })
    );
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('Render_MarksActiveTabSelected-PointsAriaControlsAtItsPanel', () => {
    mountButtons('archived');

    expect(screen.getByRole('tab', { name: 'Archived' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'Active' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(screen.getByRole('tab', { name: 'Active' })).toHaveAttribute(
      'aria-controls',
      'panel-active'
    );
    expect(screen.getByRole('tab', { name: 'Archived' })).toHaveAttribute(
      'aria-controls',
      'panel-archived'
    );
  });

  it('Render_CarriesNoTabClassOnAnyTab', () => {
    mountButtons();

    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).not.toHaveAttribute('class');
    }
  });

  it('Render_PlacesOnlyTheActiveTabInTheTabOrder', async () => {
    render(
      <>
        <Tabs
          items={BUTTONS}
          value="active"
          onChange={vi.fn()}
          aria-label="Filter"
        />
        <button type="button">After</button>
      </>
    );

    expect(screen.getByRole('tab', { name: 'Active' })).toHaveAttribute(
      'tabindex',
      '0'
    );
    expect(screen.getByRole('tab', { name: 'Archived' })).toHaveAttribute(
      'tabindex',
      '-1'
    );

    screen.getByRole('tab', { name: 'Active' }).focus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it('ClickInactiveTab_CallsOnChangeWithItsValue', async () => {
    const onChange = mountButtons();

    await userEvent.click(screen.getByRole('tab', { name: 'Archived' }));

    expect(onChange).toHaveBeenCalledWith('archived');
  });

  it('ArrowRight_MovesFocusToNextTab-CallsOnChangeWithNextValue', async () => {
    const onChange = mountButtons();

    screen.getByRole('tab', { name: 'Active' }).focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenCalledWith('archived');
    expect(screen.getByRole('tab', { name: 'Archived' })).toHaveFocus();
  });

  it('ArrowRightOnLastTab_WrapsToFirstTab', async () => {
    const onChange = mountButtons('archived');

    screen.getByRole('tab', { name: 'Archived' }).focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenCalledWith('active');
    expect(screen.getByRole('tab', { name: 'Active' })).toHaveFocus();
  });

  it('ArrowLeftOnFirstTab_WrapsToLastTab', async () => {
    const onChange = mountButtons();

    screen.getByRole('tab', { name: 'Active' }).focus();
    await userEvent.keyboard('{ArrowLeft}');

    expect(onChange).toHaveBeenCalledWith('archived');
    expect(screen.getByRole('tab', { name: 'Archived' })).toHaveFocus();
  });

  it('ArrowDown_LeavesSelectionAndFocusUnchanged', async () => {
    const onChange = mountButtons();

    screen.getByRole('tab', { name: 'Active' }).focus();
    await userEvent.keyboard('{ArrowDown}');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: 'Active' })).toHaveFocus();
  });

  it('ItemWithId_RendersThatIdOnTheTab', () => {
    render(
      <Tabs
        items={[{ label: 'Settings', value: 'settings', panelId: 'p', id: 't' }]}
        value="settings"
        onChange={vi.fn()}
        aria-label="Sections"
      />
    );

    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute(
      'id',
      't'
    );
  });
});
