import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ModalStoreRow from '../ModalStoreRow';

const store = (name: string, link: string, price: string) => ({
  name,
  link,
  price,
});

describe('ModalStoreRow', () => {
  it('CompleteStore_RendersNameAndPriceAsNewTabLink', () => {
    render(<ModalStoreRow store={store('Amazon', 'https://a', '35.50')} />);
    const link = screen.getByRole('link', { name: /Amazon/ });
    expect(link).toHaveAttribute('href', 'https://a');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(link).toHaveTextContent('$35.50');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('IncompleteStore_RendersNothing', () => {
    const { container } = render(
      <ModalStoreRow store={store('', 'https://x', '5')} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('NullStore_RendersNothing', () => {
    const { container } = render(<ModalStoreRow store={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
