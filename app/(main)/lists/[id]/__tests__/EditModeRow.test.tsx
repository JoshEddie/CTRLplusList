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

const onQuantityChange = vi.fn();
const onOpen = vi.fn();

function renderRow(
  overrides: Partial<React.ComponentProps<typeof EditModeRow>> = {}
) {
  return render(
    <EditModeRow
      item={ITEM}
      quantity={1}
      pending={false}
      onQuantityChange={onQuantityChange}
      onOpen={onOpen}
      {...overrides}
    />
  );
}

beforeEach(() => vi.clearAllMocks());

describe('EditModeRow', () => {
  it('InList_RendersSwatchNamePriceAndTheQuantityChip', () => {
    renderRow({ quantity: 4 });
    expect(screen.getByTestId('photo')).toHaveAttribute(
      'data-url',
      'https://img.example/a.png'
    );
    expect(
      screen.getAllByText('Apple', { selector: '.itemName' })
    ).toHaveLength(2);
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Change quantity for Apple' })
    ).toHaveTextContent('×4');
    expect(
      screen.queryByRole('img', { name: 'Unsaved change' })
    ).not.toBeInTheDocument();
  });

  it('InList_NamesTheStepperWithWhatIsWanted', () => {
    renderRow({ quantity: 4 });
    expect(screen.getByRole('group', { name: 'Wants 4' })).toBeInTheDocument();
  });

  it('NotInList_NamesTheStepperNotInList', () => {
    renderRow({ quantity: 0 });
    expect(
      screen.getByRole('group', { name: 'Not in list' })
    ).toBeInTheDocument();
  });

  it('NotInList_MarksTheRowOffAndOffersTheAddChip', () => {
    renderRow({ quantity: 0 });
    expect(
      screen.getByRole('button', { name: 'Add Apple to this list' })
    ).toHaveTextContent('+ Add');
    // eslint-disable-next-line testing-library/no-node-access -- the section state is a class on the row wrapper, which carries no role of its own
    const row = screen.getByTestId('photo').closest('.edit-mode-row');
    expect(row).toHaveClass('is-off');
  });

  it('Stepper_ReportsTheNumberItReachedAgainstTheItemId', async () => {
    const user = userEvent.setup();
    renderRow({ quantity: 4 });
    await user.click(screen.getByRole('button', { name: 'Increase' }));
    expect(onQuantityChange).toHaveBeenCalledExactlyOnceWith('a1', 5);
  });

  it('NotInList_LeavesOnlyTheAddEndOfTheStepperLive', () => {
    renderRow({ quantity: 0 });
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Set to minimum, 0' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Increase' })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Set to maximum, 99' })
    ).toBeEnabled();
  });

  it('StepperToZero_ReportsTheRemoval', async () => {
    const user = userEvent.setup();
    renderRow({ quantity: 1 });
    await user.click(screen.getByRole('button', { name: 'Set to minimum, 0' }));
    expect(onQuantityChange).toHaveBeenCalledExactlyOnceWith('a1', 0);
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

  it('Pending_ShowsOneDotBesideTheName', () => {
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

  it('ClickName_OpensTheSheetWithoutTouchingTheQuantity', async () => {
    const user = userEvent.setup();
    renderRow({ quantity: 0 });
    await user.click(screen.getByRole('button', { name: 'Apple' }));
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(ITEM);
    expect(onQuantityChange).not.toHaveBeenCalled();
  });

  it('ClickChip_OpensTheSheetWithoutTouchingTheQuantity', async () => {
    const user = userEvent.setup();
    renderRow({ quantity: 0 });
    await user.click(
      screen.getByRole('button', { name: 'Add Apple to this list' })
    );
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(ITEM);
    expect(onQuantityChange).not.toHaveBeenCalled();
  });

  it('NamelessItem_RendersABlankName', () => {
    renderRow({
      item: { ...(ITEM as object), name: null, store: null } as never,
    });
    expect(screen.getByTestId('photo')).toHaveAttribute('data-name', '');
    expect(
      screen.getByRole('button', { name: 'Change quantity for' })
    ).toBeInTheDocument();
  });
});
