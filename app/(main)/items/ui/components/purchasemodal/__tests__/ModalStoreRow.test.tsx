// The +N trigger is hover-opened with a collapse grace; userEvent.click's
// synthetic hover would open-then-toggle it shut, so the trigger is clicked
// with fireEvent (same convention as StoreLinks.test).
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ModalStoreRow from '../ModalStoreRow';

const store = (name: string, link: string, price: string) => ({
  name,
  link,
  price,
});

const THREE = [
  store('Etsy', 'https://e', '41.00'),
  store('Amazon', 'https://a', '35.50'),
  store('Target', 'https://t', '38.00'),
];

describe('ModalStoreRow', () => {
  it('MultiStore_PrimaryIsCheapestNewTabLink-TriggerCountsExtras', () => {
    render(<ModalStoreRow stores={THREE} />);
    const link = screen.getByRole('link', { name: /Amazon/ });
    expect(link).toHaveAttribute('href', 'https://a');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(
      screen.getByRole('button', { name: '+2 stores' })
    ).toBeInTheDocument();
  });

  it('TriggerClick_OpensMenuWithAllStoresPriceAscending', () => {
    render(<ModalStoreRow stores={THREE} />);
    fireEvent.click(screen.getByRole('button', { name: '+2 stores' }));
    const items = screen.getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual([
      'Amazon$35.50',
      'Target$38.00',
      'Etsy$41.00',
    ]);
    items.forEach((i) => {
      expect(i).toHaveAttribute('target', '_blank');
      expect(i).toHaveAttribute('rel', 'noreferrer');
    });
  });

  it('MenuItemClick_ClosesMenu', async () => {
    const user = userEvent.setup();
    render(<ModalStoreRow stores={THREE} />);
    fireEvent.click(screen.getByRole('button', { name: '+2 stores' }));
    await user.click(screen.getAllByRole('menuitem')[0]);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('SingleStore_NoExtrasTrigger', () => {
    render(<ModalStoreRow stores={[store('Amazon', 'https://a', '5')]} />);
    expect(screen.getByRole('link', { name: /Amazon/ })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('NoValidStore_RendersNothing', () => {
    const { container } = render(
      <ModalStoreRow stores={[store('', 'https://x', '5')]} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
