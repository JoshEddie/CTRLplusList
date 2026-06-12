import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updatePriority } from '@/lib/data/listItems.actions';
import SortItems, { SortableItem } from '../SortItems';

vi.mock('@/lib/data/listItems.actions', () => ({ updatePriority: vi.fn() }));

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));
import toast from 'react-hot-toast';

// Decision 5: drive the drag lifecycle by capturing DndContext's handlers and
// invoking them with synthetic { active, over } payloads — jsdom has no layout
// geometry to activate real sensors. arrayMove stays real so the optimistic
// reorder is genuine; SortableContext/useSortable/DragOverlay are thinned.
type DndHandlers = {
  onDragStart: (e: unknown) => void;
  onDragEnd: (e: unknown) => Promise<void> | void;
  onDragCancel: () => void;
};
const captured = vi.hoisted(() => ({ handlers: null as DndHandlers | null }));

vi.mock('@dnd-kit/core', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    DndContext: (props: DndHandlers & { children: React.ReactNode }) => {
      captured.handlers = {
        onDragStart: props.onDragStart,
        onDragEnd: props.onDragEnd,
        onDragCancel: props.onDragCancel,
      };
      return <div data-testid="dnd">{props.children}</div>;
    },
    DragOverlay: (props: { children: React.ReactNode }) => (
      <div data-testid="overlay">{props.children}</div>
    ),
  };
});

const sortableState = vi.hoisted(() => ({
  transform: null as { x: number; y: number } | null,
  isDragging: false,
}));
vi.mock('@dnd-kit/sortable', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    SortableContext: (props: { children: React.ReactNode }) => (
      <>{props.children}</>
    ),
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      transform: sortableState.transform,
      transition: undefined,
      isDragging: sortableState.isDragging,
    }),
  };
});

vi.mock('../Item', () => ({
  default: (p: {
    item?: { id: string; name?: string };
    showSpoilers?: boolean;
  }) => (
    <div
      data-testid="item"
      data-id={p.item?.id}
      data-name={p.item?.name}
      data-show-spoilers={String(p.showSpoilers)}
    />
  ),
}));

const ITEMS = [
  {
    id: 'A',
    name: 'Apple',
    purchases: [{ id: 'p1', firstName: 'X', by: 'other' }],
  },
  { id: 'B', name: 'Banana', purchases: [] },
  { id: 'C', name: 'Cherry', purchases: [] },
] as never[];

function gridOrder() {
  // Overlay item (when present) is also a [data-testid=item]; restrict to the grid.
  // eslint-disable-next-line testing-library/no-node-access
  const grid = document.querySelector('.item-grid') as HTMLElement;
  return Array.from(grid.querySelectorAll('[data-testid="item"]')).map((e) =>
    e.getAttribute('data-id')
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  captured.handlers = null;
  sortableState.transform = null;
  sortableState.isDragging = false;
  vi.mocked(updatePriority).mockResolvedValue({ success: true } as never);
});

afterEach(() => vi.restoreAllMocks());

describe('SortItems', () => {
  it('EmptyItems_RendersChooseItemsCTA', () => {
    render(<SortItems items={[]} listId="l1" user_id="u1" />);
    expect(screen.getByText('No items on this list yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Choose items/ })).toHaveAttribute(
      'href',
      '/lists/l1/choose-items'
    );
  });

  it('Items_RenderDragHandlesAndCards', () => {
    render(<SortItems items={ITEMS} listId="l1" user_id="u1" />);
    expect(
      screen.getAllByRole('button', { name: 'Drag to reorder item' })
    ).toHaveLength(3);
    expect(gridOrder()).toEqual(['A', 'B', 'C']);
  });

  it('ShowSpoilersProp_ReachesEachGridItem', () => {
    render(<SortItems items={ITEMS} listId="l1" user_id="u1" showSpoilers />);
    const flags = screen
      .getAllByTestId('item')
      .map((e) => e.getAttribute('data-show-spoilers'));
    expect(flags).toEqual(['true', 'true', 'true']);
  });

  it('DropOnDifferentRow_ReordersOptimistically-CallsUpdatePriority-Refreshes', async () => {
    render(<SortItems items={ITEMS} listId="l1" user_id="u1" />);
    await act(async () => {
      await captured.handlers!.onDragEnd({
        active: { id: 'A' },
        over: { id: 'C' },
      });
    });
    expect(updatePriority).toHaveBeenCalledWith('A', 'C', 'l1');
    expect(gridOrder()).toEqual(['B', 'C', 'A']);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it('DropOnSamePosition_NoCall-OrderUnchanged', async () => {
    render(<SortItems items={ITEMS} listId="l1" user_id="u1" />);
    await act(async () => {
      await captured.handlers!.onDragEnd({
        active: { id: 'A' },
        over: { id: 'A' },
      });
    });
    expect(updatePriority).not.toHaveBeenCalled();
    expect(gridOrder()).toEqual(['A', 'B', 'C']);
  });

  it('DropWithNoTarget_NoCall', async () => {
    render(<SortItems items={ITEMS} listId="l1" user_id="u1" />);
    await act(async () => {
      await captured.handlers!.onDragEnd({ active: { id: 'A' }, over: null });
    });
    expect(updatePriority).not.toHaveBeenCalled();
    expect(gridOrder()).toEqual(['A', 'B', 'C']);
  });

  it('UpdatePriorityFails_RevertsOrder-ToastsError', async () => {
    vi.mocked(updatePriority).mockResolvedValue({
      success: false,
      message: 'Conflict',
    } as never);
    render(<SortItems items={ITEMS} listId="l1" user_id="u1" />);
    await act(async () => {
      await captured.handlers!.onDragEnd({
        active: { id: 'A' },
        over: { id: 'C' },
      });
    });
    expect(gridOrder()).toEqual(['A', 'B', 'C']);
    expect(toast.error).toHaveBeenCalledWith('Conflict');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('DragStart_RendersActiveItemInOverlay', () => {
    render(<SortItems items={ITEMS} listId="l1" user_id="u1" />);
    act(() => captured.handlers!.onDragStart({ active: { id: 'B' } }));
    const overlay = screen.getByTestId('overlay');
    // eslint-disable-next-line testing-library/no-node-access
    expect(overlay.querySelector('[data-id="B"]')).toBeInTheDocument();
  });

  it('DragCancel_ClearsOverlay', () => {
    render(<SortItems items={ITEMS} listId="l1" user_id="u1" />);
    act(() => captured.handlers!.onDragStart({ active: { id: 'B' } }));
    act(() => captured.handlers!.onDragCancel());
    const overlay = screen.getByTestId('overlay');
    // eslint-disable-next-line testing-library/no-node-access
    expect(overlay.querySelector('[data-id]')).not.toBeInTheDocument();
  });

  it('ItemsPropChange_ResyncsState', () => {
    const { rerender } = render(
      <SortItems items={ITEMS} listId="l1" user_id="u1" />
    );
    // `Z` has no `purchases` field — exercises the `?? []` fallback in itemsKey.
    rerender(
      <SortItems
        items={[{ id: 'Z', name: 'Zed' }] as never}
        listId="l1"
        user_id="u1"
      />
    );
    expect(gridOrder()).toEqual(['Z']);
  });

  describe('SortableItem', () => {
    it('Dragging_AppliesTransform-IsDragging-DragActive-ExtraClass', () => {
      sortableState.transform = { x: 5, y: 10 };
      sortableState.isDragging = true;
      render(
        <SortableItem id="A" item={ITEMS[0]} className="extra" isAnyDragging />
      );
      // eslint-disable-next-line testing-library/no-node-access
      const wrapper = document.querySelector('.sortable-item') as HTMLElement;
      expect(wrapper.className).toContain('is-dragging');
      expect(wrapper.className).toContain('drag-active');
      expect(wrapper.className).toContain('extra');
      expect(wrapper).toHaveAttribute('data-dragging', 'true');
      expect(wrapper.style.transform).toBe('translate3d(5px, 10px, 0)');
    });
  });
});
