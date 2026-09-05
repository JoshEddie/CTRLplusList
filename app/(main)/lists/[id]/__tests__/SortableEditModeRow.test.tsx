import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SortableEditModeRow from '../SortableEditModeRow';

vi.mock('@/app/(main)/items/ui/components/ItemPhoto', () => ({
  default: () => <div data-testid="photo" />,
}));

const sortable = vi.hoisted(() => ({
  state: {
    transform: null as { x: number; y: number } | null,
    isDragging: false,
  },
  calls: [] as { id: string; disabled: boolean }[],
}));
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: (args: { id: string; disabled: boolean }) => {
    sortable.calls.push(args);
    return {
      attributes: { role: 'button', tabIndex: 0 },
      listeners: {},
      setNodeRef: () => {},
      transform: sortable.state.transform,
      transition: undefined,
      isDragging: sortable.state.isDragging,
    };
  },
}));

const ITEM = { id: 'a1', name: 'Apple', description: '', store: null } as never;

function renderRow(disabled = false) {
  return render(
    <SortableEditModeRow
      item={ITEM}
      quantity={1}
      pending={false}
      disabled={disabled}
      onQuantityChange={vi.fn()}
      onOpen={vi.fn()}
    />
  );
}

beforeEach(() => {
  sortable.state = { transform: null, isDragging: false };
  sortable.calls = [];
});

describe('SortableEditModeRow', () => {
  it('AtRest_RendersUntransformedRowWithHandleAheadOfTheSwatch', () => {
    renderRow();
    const row = screen.getByRole('listitem');
    expect(row).toHaveClass('edit-mode-item');
    expect(row).not.toHaveClass('is-dragging');
    expect(row.style.transform).toBe('');
    const handle = screen.getByRole('button', { name: 'Drag to reorder' });
    expect(
      handle.compareDocumentPosition(screen.getByTestId('photo')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(sortable.calls[0]).toEqual({ id: 'a1', disabled: false });
  });

  it('Dragging_TranslatesTheRowAndMarksIt', () => {
    sortable.state = { transform: { x: 0, y: 40 }, isDragging: true };
    renderRow();
    const row = screen.getByRole('listitem');
    expect(row).toHaveClass('is-dragging');
    expect(row.style.transform).toBe('translate3d(0px, 40px, 0)');
  });

  it('Disabled_PassesDisabledToTheSortable', () => {
    renderRow(true);
    expect(sortable.calls[0]).toEqual({ id: 'a1', disabled: true });
  });
});
