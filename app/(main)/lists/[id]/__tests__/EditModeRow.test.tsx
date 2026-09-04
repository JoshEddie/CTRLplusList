import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditModeRow from '../EditModeRow';

vi.mock('@/app/(main)/items/ui/components/ItemPhoto', () => ({
  default: (p: { url: string; name: string }) => (
    <div data-testid="photo" data-url={p.url} data-name={p.name} />
  ),
}));

const ITEM = {
  id: 'a1',
  name: 'Apple',
  description: '',
  image_url: 'https://img.example/a.png',
  store: { name: 'Amazon', price: '5.00', link: 'https://a.example' },
} as never;

const onToggle = vi.fn();

function renderRow(
  overrides: Partial<React.ComponentProps<typeof EditModeRow>> = {}
) {
  return render(
    <EditModeRow
      item={ITEM}
      inList
      pending={false}
      onToggle={onToggle}
      {...overrides}
    />
  );
}

beforeEach(() => vi.clearAllMocks());

describe('EditModeRow', () => {
  it('InList_RendersSwatchNamePriceAndCheckedBox-NoLabel', () => {
    renderRow();
    expect(screen.getByTestId('photo')).toHaveAttribute(
      'data-url',
      'https://img.example/a.png'
    );
    expect(
      screen.getByText('Apple', { selector: '.itemName' })
    ).toBeInTheDocument();
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Apple' })).toBeChecked();
    expect(screen.queryByText('Not in list')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'Unsaved change' })
    ).not.toBeInTheDocument();
  });

  it('NotInList_RendersTheLabelAndAnUncheckedBox', () => {
    renderRow({ inList: false });
    expect(screen.getByText('Not in list')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Apple' })).not.toBeChecked();
    // eslint-disable-next-line testing-library/no-node-access -- the section state is a class on the wrapping <label>, which carries no role of its own
    const row = screen.getByRole('checkbox').closest('label.edit-mode-row');
    expect(row).toHaveClass('is-off');
  });

  it('LinkedStore_RendersViewItemLinkInANewTab', () => {
    renderRow();
    const link = screen.getByRole('link', {
      name: 'View item — opens in new tab',
    });
    expect(link).toHaveAttribute('href', 'https://a.example');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('Description_RendersAsTheNoteLine', () => {
    renderRow({
      item: { ...(ITEM as object), description: 'Cream or sage' } as never,
    });
    expect(screen.getByText('Cream or sage')).toHaveClass('edit-mode-row-note');
  });

  it('Pending_ShowsTheDotBesideTheName', () => {
    renderRow({ pending: true });
    expect(
      screen.getByRole('img', { name: 'Unsaved change' })
    ).toBeInTheDocument();
  });

  it('Handle_RendersAheadOfTheSwatch', () => {
    renderRow({ handle: <button type="button">handle</button> });
    const handle = screen.getByRole('button', { name: 'handle' });
    expect(
      handle.compareDocumentPosition(screen.getByTestId('photo')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('ClickBox_CallsOnToggleWithTheItemId', async () => {
    const user = userEvent.setup();
    renderRow();
    await user.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith('a1');
  });

  it('NamelessItem_RendersABlankNameAndLabel', () => {
    renderRow({
      item: { ...(ITEM as object), name: null, store: null } as never,
    });
    expect(screen.getByRole('checkbox')).toHaveAccessibleName('');
    expect(screen.getByTestId('photo')).toHaveAttribute('data-name', '');
  });
});
