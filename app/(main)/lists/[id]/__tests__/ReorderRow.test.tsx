import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReorderRow from '../ReorderRow';

vi.mock('@/app/(main)/items/ui/components/ItemPhoto', () => ({
  default: () => <div data-testid="photo" />,
}));

const sortable = vi.hoisted(() => ({
  state: {
    transform: null as { x: number; y: number } | null,
    isDragging: false,
  },
  calls: [] as { id: string }[],
}));
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: (args: { id: string }) => {
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

const ITEM = {
  id: 'a1' as string,
  name: 'Apple',
  quantity: 3,
  image_url: null,
  store: { name: 'Amazon', price: '5.00', link: 'https://a.example' },
};

function renderRow(
  overrides: Partial<React.ComponentProps<typeof ReorderRow>> = {}
) {
  const onMoveUp = vi.fn();
  const onMoveDown = vi.fn();
  const view = render(
    <ReorderRow
      item={ITEM as never}
      position={2}
      isFirst={false}
      isLast={false}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      {...overrides}
    />
  );
  return { view, onMoveUp, onMoveDown };
}

beforeEach(() => {
  sortable.state = { transform: null, isDragging: false };
  sortable.calls = [];
});

describe('ReorderRow', () => {
  it('AtRest_StatesThePositionNameQuantityAndBothWaysToMove', () => {
    renderRow();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('×3')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Drag Apple to reorder' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Move Apple up' })
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Move Apple down' })
    ).toBeEnabled();
    expect(sortable.calls[0]).toEqual({ id: 'a1' });
  });

  it('UpArrow_ReportsTheMoveUp', async () => {
    const { onMoveUp, onMoveDown } = renderRow();
    await userEvent.click(screen.getByRole('button', { name: 'Move Apple up' }));
    expect(onMoveUp).toHaveBeenCalledTimes(1);
    expect(onMoveDown).not.toHaveBeenCalled();
  });

  it('DownArrow_ReportsTheMoveDown', async () => {
    const { onMoveUp, onMoveDown } = renderRow();
    await userEvent.click(
      screen.getByRole('button', { name: 'Move Apple down' })
    );
    expect(onMoveDown).toHaveBeenCalledTimes(1);
    expect(onMoveUp).not.toHaveBeenCalled();
  });

  // The pair keeps one shape down the whole list: an end disables its arrow
  // rather than dropping it, so no row is a column narrower than its neighbour.
  it('FirstRow_DisablesUpAndKeepsDown', () => {
    renderRow({ isFirst: true, position: 1 });
    expect(
      screen.getByRole('button', { name: 'Move Apple up' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Move Apple down' })
    ).toBeEnabled();
  });

  it('LastRow_DisablesDownAndKeepsUp', () => {
    renderRow({ isLast: true });
    expect(
      screen.getByRole('button', { name: 'Move Apple down' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Move Apple up' })
    ).toBeEnabled();
  });

  it('Dragging_TranslatesTheRowAndMarksIt', () => {
    sortable.state = { transform: { x: 0, y: 40 }, isDragging: true };
    renderRow();
    const row = screen.getByRole('listitem');
    expect(row).toHaveClass('is-dragging');
    expect(row.style.transform).toBe('translate3d(0px, 40px, 0)');
  });

  it('NamelessEntry_StillOffersBothArrowsAndAHandle', () => {
    renderRow({ item: { ...ITEM, name: null, quantity: null } as never });
    expect(
      screen.getByRole('button', { name: /Drag\s+to reorder/ })
    ).toBeInTheDocument();
    expect(screen.getByText('×0')).toBeInTheDocument();
  });
});
