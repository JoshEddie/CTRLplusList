import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditModeNotInList from '../EditModeNotInList';

vi.mock('@/app/(main)/items/ui/components/ItemPhoto', () => ({
  default: () => <div data-testid="photo" />,
}));

const ITEMS = [
  { id: 'a1', name: 'Apple', description: '', store: null },
] as never[];

const onToggle = vi.fn();
const onCreate = vi.fn();

function renderSection(
  overrides: Partial<React.ComponentProps<typeof EditModeNotInList>> = {}
) {
  return render(
    <EditModeNotInList
      rows={ITEMS}
      total={1}
      filtered={false}
      pending={new Set()}
      onToggle={onToggle}
      onCreate={onCreate}
      {...overrides}
    />
  );
}

beforeEach(() => vi.clearAllMocks());

describe('EditModeNotInList', () => {
  it('Rows_RenderAfterTheCreateControlWithTheNotInListLabel', () => {
    renderSection();
    expect(
      screen.getByRole('heading', { name: 'Not in this list · 1' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    const create = screen.getByRole('button', { name: /Create new item/ });
    expect(
      create.compareDocumentPosition(screen.getByRole('list')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByText('Not in list')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Drag to reorder' })
    ).not.toBeInTheDocument();
  });

  it('ClickCreate_CallsOnCreate', async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole('button', { name: /Create new item/ }));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it('Filtered_ShowsShownOfTotal', () => {
    renderSection({ rows: [], total: 3, filtered: true });
    expect(
      screen.getByRole('heading', { name: 'Not in this list · 0 of 3' })
    ).toBeInTheDocument();
    expect(screen.getByText('No other items match.')).toBeInTheDocument();
  });

  it('LibraryExhausted_ShowsExhaustedCopy-KeepsCreate', () => {
    renderSection({ rows: [], total: 0 });
    expect(
      screen.getByText('Every item you own is already on this list.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Create new item/ })
    ).toBeInTheDocument();
  });

  it('PendingRow_CarriesTheDot', () => {
    renderSection({ pending: new Set(['a1']) });
    expect(
      screen.getByRole('img', { name: 'Unsaved change' })
    ).toBeInTheDocument();
  });
});
