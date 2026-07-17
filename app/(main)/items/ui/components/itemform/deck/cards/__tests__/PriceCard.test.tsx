import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeItem, mockActions } from '../../__tests__/test-helpers';
import { PriceCard } from '../PriceCard';

function setup(over = {}, productUrl = '') {
  render(
    <PriceCard
      item={makeItem(over)}
      actions={mockActions()}
      productUrl={productUrl}
      onContinue={vi.fn()}
    />
  );
}

describe('PriceCard', () => {
  it('EmptyPrice_ShowsRequiredNote-DisablesContinue', () => {
    setup({ stores: [{ name: 'Lodge', link: 'https://l', price: '' }] });
    expect(screen.getByText(/A price is required/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('ValidPrice_HidesRequiredNote-EnablesContinue', () => {
    setup({ stores: [{ name: 'Lodge', link: 'https://l', price: '12.00' }] });
    expect(screen.queryByText(/A price is required/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('NoProductUrl_FallsBackToStoreLinkForSourceLink', () => {
    setup({ stores: [{ name: 'Lodge', link: 'https://store.test/p', price: '' }] }, '');
    expect(
      screen.getByRole('link', { name: /open the product page/i })
    ).toHaveAttribute('href', 'https://store.test/p');
  });

  it('WithProductUrl_UsesItForSourceLink', () => {
    setup(
      { stores: [{ name: 'Lodge', link: 'https://store.test/p', price: '' }] },
      'https://pasted.test/p'
    );
    expect(
      screen.getByRole('link', { name: /open the product page/i })
    ).toHaveAttribute('href', 'https://pasted.test/p');
  });

  it('NoStoreRow_ShowsRequiredNote-DisablesContinue', () => {
    setup({ stores: [] }, 'https://pasted.test/p');
    expect(screen.getByText(/A price is required/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});
