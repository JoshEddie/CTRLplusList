import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditModeInList from '../EditModeInList';

vi.mock('@/app/(main)/items/ui/components/ItemPhoto', () => ({
  default: () => <div data-testid="photo" />,
}));

// The drop is dnd-kit's to deliver; what this section owns is how it reads
// one, so the context is replaced with buttons that hand it three shapes.
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  type Drop = { active: { id: string }; over: { id: string } | null };
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragEnd: (event: Drop) => void;
    }) => (
      <div>
        <button
          type="button"
          onClick={() =>
            onDragEnd({ active: { id: 'a1' }, over: { id: 'a2' } })
          }
        >
          drop-a1-on-a2
        </button>
        <button
          type="button"
          onClick={() =>
            onDragEnd({ active: { id: 'a1' }, over: { id: 'a1' } })
          }
        >
          drop-a1-on-itself
        </button>
        <button
          type="button"
          onClick={() => onDragEnd({ active: { id: 'a1' }, over: null })}
        >
          drop-a1-nowhere
        </button>
        {children}
      </div>
    ),
  };
});

const ITEMS = [
  { id: 'a1', name: 'Apple', description: '', store: null },
  { id: 'a2', name: 'Banana', description: '', store: null },
] as never[];

const QUANTITIES: Record<string, number> = { a1: 1, a2: 3 };

const onQuantityChange = vi.fn();
const onOpen = vi.fn();
const onReorder = vi.fn();

function renderSection(
  overrides: Partial<React.ComponentProps<typeof EditModeInList>> = {}
) {
  return render(
    <EditModeInList
      rows={ITEMS}
      total={2}
      filtered={false}
      quantityOf={(itemId) => QUANTITIES[itemId]}
      pending={new Set()}
      onQuantityChange={onQuantityChange}
      onOpen={onOpen}
      onReorder={onReorder}
      {...overrides}
    />
  );
}

beforeEach(() => vi.clearAllMocks());

describe('EditModeInList', () => {
  it('Rows_RenderInOrderWithLiveHandles', () => {
    renderSection();
    expect(
      screen.getByRole('heading', { name: 'In this list · 2' })
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('button', { name: /^Change quantity for/ })
        .map((chip) => chip.textContent)
    ).toEqual(['×1', '×3']);
    for (const handle of screen.getAllByRole('button', {
      name: 'Drag to reorder',
    })) {
      expect(handle).not.toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('DropOnAnotherRow_ReportsActiveOverTarget', async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole('button', { name: 'drop-a1-on-a2' }));
    expect(onReorder).toHaveBeenCalledExactlyOnceWith('a1', 'a2');
  });

  it('DropOnItselfOrNowhere_ReportsNothing', async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole('button', { name: 'drop-a1-on-itself' }));
    await user.click(screen.getByRole('button', { name: 'drop-a1-nowhere' }));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('Filtered_ShowsShownOfTotal-Hint-InertHandles', () => {
    renderSection({ rows: [ITEMS[0]], filtered: true });
    expect(
      screen.getByRole('heading', { name: 'In this list · 1 of 2' })
    ).toBeInTheDocument();
    expect(screen.getByText('Clear search to reorder')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Drag to reorder' })
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('FilteredToNothing_ShowsNoMatchesCopy-NoList', () => {
    renderSection({ rows: [], filtered: true });
    expect(
      screen.getByText('Nothing in your list matches.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('ListEmpty_ShowsEmptyCopy-NoHintEvenWhenFiltered', () => {
    renderSection({ rows: [], total: 0, filtered: true });
    expect(
      screen.getByText('Your list is empty. Add any item below.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Clear search to reorder')
    ).not.toBeInTheDocument();
  });

  it('PendingRow_CarriesTheDot', () => {
    renderSection({ pending: new Set(['a2']) });
    expect(screen.getAllByRole('img', { name: 'Unsaved change' })).toHaveLength(
      1
    );
  });
});
