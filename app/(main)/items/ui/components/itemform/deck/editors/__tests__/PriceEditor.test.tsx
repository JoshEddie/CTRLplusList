import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PriceEditor } from '../PriceEditor';

describe('PriceEditor', () => {
  it('TypeDigits_CallsOnChangeWithFormattedPrice', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PriceEditor price="" onChange={onChange} />);
    // PriceField is cents-based: "9" → $0.09.
    await user.type(screen.getByLabelText('Price'), '9');
    expect(onChange).toHaveBeenLastCalledWith('0.09');
  });

  it('FetchedPrice_DisplaysFormattedAmount', () => {
    render(<PriceEditor price="24.5" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Price')).toHaveValue('24.50');
  });

  it('EmptyPrice_DisplaysBlank', () => {
    render(<PriceEditor price="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Price')).toHaveValue('');
  });

  it('PricedItem_ClearButtonEmptiesToNoPrice', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PriceEditor price="24.50" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Clear price' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('EmptyPrice_NoClearButton', () => {
    render(<PriceEditor price="" onChange={vi.fn()} />);
    expect(
      screen.queryByRole('button', { name: 'Clear price' })
    ).not.toBeInTheDocument();
  });

  it('WithProductUrl_RendersOpenPageLinkNewTab', () => {
    render(
      <PriceEditor
        price=""
        onChange={vi.fn()}
        productUrl="https://shop.test/p"
      />
    );
    const link = screen.getByRole('link', { name: /open the product page/i });
    expect(link).toHaveAttribute('href', 'https://shop.test/p');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('NoProductUrl_RendersNoLink', () => {
    render(<PriceEditor price="" onChange={vi.fn()} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
