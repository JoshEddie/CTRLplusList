import { HERO_BAND_SLOT_ID } from '@/app/(main)/lists/ui/components/ListHeroSurface';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ListOwnerBand from '../ListOwnerBand';

function renderBand(
  overrides: Partial<React.ComponentProps<typeof ListOwnerBand>> = {}
) {
  const onTabChange = vi.fn();
  const onCreate = vi.fn();
  const onChooseExisting = vi.fn();
  const view = render(
    <ListOwnerBand
      tab="list"
      onTabChange={onTabChange}
      inListCount={3}
      showReorder
      onCreate={onCreate}
      onChooseExisting={onChooseExisting}
      {...overrides}
    />
  );
  return { view, onTabChange, onCreate, onChooseExisting };
}

let heroSlot: HTMLElement | null = null;

function mountHeroSlot() {
  heroSlot = document.createElement('div');
  heroSlot.id = HERO_BAND_SLOT_ID;
  document.body.appendChild(heroSlot);
  return heroSlot;
}

afterEach(() => {
  heroSlot?.remove();
  heroSlot = null;
});

describe('ListOwnerBand', () => {
  it('Default_NamesEveryTabWithTheEntryCount-SelectsTheGivenTab', () => {
    renderBand();
    expect(
      screen.getByRole('tab', { name: 'In this list · 3' })
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'All items' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(screen.getByRole('tab', { name: 'Reorder' })).toBeInTheDocument();
  });

  // One entry has no order to arrange, so the tab that would render it is not
  // offered at all.
  it('ReorderUnavailable_OffersOnlyTheTwoItemTabs', () => {
    renderBand({ showReorder: false, inListCount: 1 });
    expect(screen.queryByRole('tab', { name: 'Reorder' })).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('ClickReorder_ReportsTheReorderTab', async () => {
    const { onTabChange } = renderBand();
    await userEvent.click(screen.getByRole('tab', { name: 'Reorder' }));
    expect(onTabChange).toHaveBeenCalledWith('reorder');
  });

  it('ClickAllItems_ReportsTheLibraryTab', async () => {
    const { onTabChange } = renderBand();
    await userEvent.click(screen.getByRole('tab', { name: 'All items' }));
    expect(onTabChange).toHaveBeenCalledWith('library');
  });

  it('ChooseFromExisting_ReportsTheLibraryTabWithoutCreating', async () => {
    const { onChooseExisting, onCreate } = renderBand();
    await userEvent.click(screen.getByRole('button', { name: 'Add item' }));
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Choose from existing' })
    );
    expect(onChooseExisting).toHaveBeenCalledTimes(1);
    expect(onCreate).not.toHaveBeenCalled();
  });

  // Without the hero chrome's slot (pre-hydration, or no hero at all) the band
  // renders where it stands rather than vanishing.
  it('NoHeroSlot_RendersInline', () => {
    const { view } = renderBand();
    expect(within(view.container).getByRole('tablist')).toBeInTheDocument();
  });

  it('HeroSlotPresent_RendersIntoTheSlot', () => {
    const slot = mountHeroSlot();
    const { view } = renderBand();
    expect(within(view.container).queryByRole('tablist')).toBeNull();
    expect(
      within(slot).getByRole('tab', { name: 'All items' })
    ).toBeInTheDocument();
  });
});
