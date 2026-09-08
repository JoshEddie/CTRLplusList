import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditModeQuantitySheet from '../EditModeQuantitySheet';

vi.mock('@/app/(main)/items/ui/components/ItemPhoto', () => ({
  default: (p: { url: string }) => <div data-testid="photo" data-url={p.url} />,
}));

const ITEM = {
  id: 'a1',
  name: 'Apple',
  description: 'Cream or sage',
  image_url: 'https://img.example/a.png',
  store: { name: 'Amazon', price: '5.00', link: 'https://a.example' },
} as never;

const onQuantityChange = vi.fn();
const onClose = vi.fn();

function renderSheet(
  overrides: Partial<React.ComponentProps<typeof EditModeQuantitySheet>> = {}
) {
  return render(
    <EditModeQuantitySheet
      item={ITEM}
      quantity={4}
      onQuantityChange={onQuantityChange}
      onClose={onClose}
      {...overrides}
    />
  );
}

beforeEach(() => vi.clearAllMocks());

describe('EditModeQuantitySheet', () => {
  it('InList_HeadsWithWantsAndCarriesTheItemsNoteSwatchAndPrice', () => {
    renderSheet();
    expect(screen.getByRole('heading', { name: 'Apple' })).toBeInTheDocument();
    expect(screen.getByTestId('photo')).toHaveAttribute(
      'data-url',
      'https://img.example/a.png'
    );
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.getByText('Cream or sage')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Wants 4' })
    ).toBeInTheDocument();
  });

  it('NotInList_HeadsWithTheBumpToAddPrompt', () => {
    renderSheet({ quantity: 0 });
    expect(
      screen.getByRole('group', { name: 'Not in list · bump to add' })
    ).toBeInTheDocument();
  });

  it('Bump_ReportsTheNumberAgainstTheItemId', async () => {
    const user = userEvent.setup();
    renderSheet({ quantity: 0 });
    await user.click(screen.getByRole('button', { name: 'Increase' }));
    expect(onQuantityChange).toHaveBeenCalledExactlyOnceWith('a1', 1);
  });

  it('LinkedStore_OffersViewItemInANewTab', () => {
    renderSheet();
    const link = screen.getByRole('link', {
      name: 'View item — opens in new tab',
    });
    expect(link).toHaveAttribute('href', 'https://a.example');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('LinklessStore_OffersOnlyDone', () => {
    renderSheet({ item: { ...(ITEM as object), store: null } as never });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Done' })
    ).toBeInTheDocument();
  });

  it('NamelessItem_RendersABlankHeading', () => {
    renderSheet({ item: { ...(ITEM as object), name: null } as never });
    expect(screen.getByRole('heading')).toHaveTextContent(/^$/);
  });

  it('NotelessItem_RendersNoNoteLine', () => {
    renderSheet({ item: { ...(ITEM as object), description: '' } as never });
    expect(screen.queryByText('Cream or sage')).not.toBeInTheDocument();
  });

  it('ClickDone_ClosesWithoutWritingAnything', async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onQuantityChange).not.toHaveBeenCalled();
  });
});
