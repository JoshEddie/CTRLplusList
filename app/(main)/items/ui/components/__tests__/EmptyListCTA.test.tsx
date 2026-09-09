import { OwnerTabsContext } from '@/app/(main)/lists/[id]/ownerTabs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EmptyListCTA from '../EmptyListCTA';

const showLibrary = vi.fn();

const renderCTA = () =>
  render(
    <OwnerTabsContext.Provider value={{ showList: vi.fn(), showLibrary, createItem: vi.fn() }}>
      <EmptyListCTA />
    </OwnerTabsContext.Provider>
  );

const door = () => screen.getByRole('button', { name: 'Choose Items' });

describe('EmptyListCTA', () => {
  it('Render_NamesTheEmptyListAndOffersTheLibrary', () => {
    renderCTA();
    expect(
      screen.getByRole('heading', { name: 'No items on this list yet' })
    ).toBeInTheDocument();
    expect(door()).toBeInTheDocument();
  });

  it('ClickTheDoor_SelectsTheAllItemsTab', async () => {
    renderCTA();
    await userEvent.click(door());
    expect(showLibrary).toHaveBeenCalledTimes(1);
  });
});
