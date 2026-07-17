import { render, screen } from '@testing-library/react';
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
  it('LegacyMultiStoreItem_RendersOnlyCheapestAsNewTabLink-NoExtrasTrigger', () => {
    render(<ModalStoreRow stores={THREE} />);
    const link = screen.getByRole('link', { name: /Amazon/ });
    expect(link).toHaveAttribute('href', 'https://a');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/\+2/)).not.toBeInTheDocument();
  });

  it('SingleStore_RendersNameAndPriceLink', () => {
    render(<ModalStoreRow stores={[store('Amazon', 'https://a', '5')]} />);
    const link = screen.getByRole('link', { name: /Amazon/ });
    expect(link).toHaveTextContent('$5.00');
  });

  it('NoValidStore_RendersNothing', () => {
    const { container } = render(
      <ModalStoreRow stores={[store('', 'https://x', '5')]} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
