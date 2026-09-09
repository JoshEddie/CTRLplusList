import { HERO_FREEZE_ATTR } from '@/app/(main)/lists/ui/components/ListHeroSurface';
import { updatePriority } from '@/lib/data/listItems.actions';
import { ItemDisplay } from '@/lib/types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OwnerTabsContext } from '../ownerTabs';
import ReorderList from '../ReorderList';

vi.mock('@/lib/data/listItems.actions', () => ({ updatePriority: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
vi.mock('@/app/(main)/items/ui/components/ItemPhoto', () => ({
  default: () => <div data-testid="photo" />,
}));

// The drop and the drag's start and end are dnd-kit's to deliver; what this
// surface owns is how it reads them, so the context becomes buttons that hand
// it each one.
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  type Drop = { active: { id: string }; over: { id: string } | null };
  return {
    ...actual,
    DndContext: ({
      children,
      onDragStart,
      onDragEnd,
      onDragCancel,
    }: {
      children: React.ReactNode;
      onDragStart: () => void;
      onDragEnd: (event: Drop) => void;
      onDragCancel: () => void;
    }) => (
      <div>
        <button type="button" onClick={onDragStart}>
          drag-start
        </button>
        <button type="button" onClick={onDragCancel}>
          drag-cancel
        </button>
        <button
          type="button"
          onClick={() => onDragEnd({ active: { id: 'a1' }, over: { id: 'c1' } })}
        >
          drop-a1-on-c1
        </button>
        <button
          type="button"
          onClick={() => onDragEnd({ active: { id: 'a1' }, over: null })}
        >
          drop-a1-nowhere
        </button>
        <button
          type="button"
          onClick={() => onDragEnd({ active: { id: 'a1' }, over: { id: 'a1' } })}
        >
          drop-a1-on-itself
        </button>
        {children}
      </div>
    ),
  };
});

const item = (id: string, name: string) =>
  ({ id, name, quantity: 1, image_url: null, store: null }) as ItemDisplay;

const ITEMS = [item('a1', 'Apple'), item('b1', 'Banana'), item('c1', 'Cherry')];

const showList = vi.fn();

function renderList(items = ITEMS) {
  return render(
    <OwnerTabsContext.Provider
      value={{
        showList,
        showLibrary: vi.fn(),
        showReorder: vi.fn(),
        createItem: vi.fn(),
      }}
    >
      <ReorderList listId="l1" items={items} />
    </OwnerTabsContext.Provider>
  );
}

const rows = () =>
  screen
    .getAllByRole('listitem')
    .map((li) => li.textContent?.match(/^(\d+)([A-Z]\w+)/)?.slice(1).join(' '));

const names = () =>
  rows().map((row) => row?.split(' ')[1]);

const press = (name: string) =>
  userEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  vi.mocked(updatePriority).mockReset();
  vi.mocked(updatePriority).mockResolvedValue({
    success: true,
    message: 'ok',
  });
  vi.mocked(toast.error).mockClear();
  showList.mockClear();
  document.documentElement.removeAttribute(HERO_FREEZE_ATTR);
});

describe('ReorderList', () => {
  it('Default_ListsEveryEntryInOrderNumberedFromOne', () => {
    renderList();
    expect(rows()).toEqual(['1 Apple', '2 Banana', '3 Cherry']);
  });

  it('MoveDown_SwapsWithTheNextRowAndWritesAgainstIt', async () => {
    renderList();
    await press('Move Apple down');
    expect(names()).toEqual(['Banana', 'Apple', 'Cherry']);
    await waitFor(() =>
      expect(updatePriority).toHaveBeenCalledExactlyOnceWith('a1', 'b1', 'l1')
    );
  });

  it('MoveUp_SwapsWithThePreviousRowAndWritesAgainstIt', async () => {
    renderList();
    await press('Move Cherry up');
    expect(names()).toEqual(['Apple', 'Cherry', 'Banana']);
    await waitFor(() =>
      expect(updatePriority).toHaveBeenCalledExactlyOnceWith('c1', 'b1', 'l1')
    );
  });

  it('Drop_MovesTheDraggedRowToTheTargetAndWritesAgainstIt', async () => {
    renderList();
    await press('drop-a1-on-c1');
    expect(names()).toEqual(['Banana', 'Cherry', 'Apple']);
    await waitFor(() =>
      expect(updatePriority).toHaveBeenCalledExactlyOnceWith('a1', 'c1', 'l1')
    );
  });

  // A drop that names no neighbour to compute a midpoint against.
  describe('DropWithNothingToMovePast', () => {
    it('OutsideEveryRow_LeavesTheOrderAloneAndWritesNothing', async () => {
      renderList();
      await press('drop-a1-nowhere');
      expect(names()).toEqual(['Apple', 'Banana', 'Cherry']);
      expect(updatePriority).not.toHaveBeenCalled();
    });

    it('BackOnItsOwnRow_LeavesTheOrderAloneAndWritesNothing', async () => {
      renderList();
      await press('drop-a1-on-itself');
      expect(names()).toEqual(['Apple', 'Banana', 'Cherry']);
      expect(updatePriority).not.toHaveBeenCalled();
    });
  });

  it('RefusedMove_PutsTheRowBackAndSaysWhy', async () => {
    vi.mocked(updatePriority).mockResolvedValue({
      success: false,
      message: 'Item or target not found on this list',
    });
    renderList();
    await press('Move Apple down');
    await waitFor(() => expect(names()).toEqual(['Apple', 'Banana', 'Cherry']));
    expect(toast.error).toHaveBeenCalledWith(
      'Item or target not found on this list'
    );
  });

  // The revert must never undo a move made after the one that failed: the
  // ticket is what makes a slow refusal land on nothing.
  it('RefusedMoveOvertakenByAnother_LeavesTheLaterOrderStanding', async () => {
    let refuse: (() => void) | undefined;
    vi.mocked(updatePriority).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          refuse = () =>
            resolve({ success: false, message: 'Failed to update item' });
        })
    );
    renderList();
    await press('Move Apple down');
    await press('Move Cherry up');
    expect(names()).toEqual(['Banana', 'Cherry', 'Apple']);
    refuse?.();
    await waitFor(() => expect(updatePriority).toHaveBeenCalledTimes(2));
    expect(names()).toEqual(['Banana', 'Cherry', 'Apple']);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('Drag_FreezesTheHeroForItsLengthAndReleasesOnDrop', async () => {
    renderList();
    await press('drag-start');
    expect(document.documentElement).toHaveAttribute(HERO_FREEZE_ATTR);
    await press('drop-a1-on-c1');
    expect(document.documentElement).not.toHaveAttribute(HERO_FREEZE_ATTR);
  });

  it('CancelledDrag_ReleasesTheHeroToo', async () => {
    renderList();
    await press('drag-start');
    await press('drag-cancel');
    expect(document.documentElement).not.toHaveAttribute(HERO_FREEZE_ATTR);
  });

  it('UnmountedMidDrag_ReleasesTheHero', async () => {
    const { unmount } = renderList();
    await press('drag-start');
    unmount();
    expect(document.documentElement).not.toHaveAttribute(HERO_FREEZE_ATTR);
  });

  it('Done_LeavesTheModeWithoutASaveStep', async () => {
    renderList();
    await press('Done');
    expect(showList).toHaveBeenCalledTimes(1);
    expect(updatePriority).not.toHaveBeenCalled();
  });
});
