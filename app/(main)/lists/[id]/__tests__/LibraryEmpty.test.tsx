import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LibraryEmpty from '../LibraryEmpty';
import { OwnerTabsContext } from '../ownerTabs';

const createItem = vi.fn();

const renderEmpty = () =>
  render(
    <OwnerTabsContext.Provider value={{ showList: vi.fn(), showLibrary: vi.fn(), createItem }}>
      <LibraryEmpty />
    </OwnerTabsContext.Provider>
  );

const door = () => screen.getByRole('button', { name: 'Create a new item' });

describe('LibraryEmpty', () => {
  it('Render_NamesTheEmptyLibraryAndOffersCreation', () => {
    renderEmpty();
    expect(
      screen.getByRole('heading', { name: 'No items in your library yet' })
    ).toBeInTheDocument();
    expect(door()).toBeInTheDocument();
  });

  it('ClickTheDoor_OpensTheItemForm', async () => {
    renderEmpty();
    await userEvent.click(door());
    expect(createItem).toHaveBeenCalledTimes(1);
  });

  // The panels only ever render inside the band, so a missing provider is a
  // wiring mistake worth failing loudly rather than a button that does nothing.
  describe('OutsideTheBand', () => {
    beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
    afterEach(() => vi.restoreAllMocks());

    it('Render_ThrowsMissingOwnerBand', () => {
      expect(() => render(<LibraryEmpty />)).toThrow(
        'useOwnerTabs must be used inside the owner band'
      );
    });
  });
});
