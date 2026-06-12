/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The thumbnail is decorative (aria-hidden) and the price line has no role;
 * both are asserted by class.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PurchaseModalHeader from '../PurchaseModalHeader';

const makeItem = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'i1',
    name: 'Fancy Mug',
    image_url: '',
    stores: [],
    ...overrides,
  }) as never;

describe('PurchaseModalHeader', () => {
  it('ImageAndStores_RendersThumbnailNameAndPrice', () => {
    const { container } = render(
      <PurchaseModalHeader
        item={makeItem({
          image_url: 'https://img.example/mug.jpg',
          stores: [{ name: 'Amazon', link: 'https://a', price: '35.50' }],
        })}
      />
    );
    expect(
      screen.getByRole('heading', { name: 'Fancy Mug' })
    ).toBeInTheDocument();
    expect(container.querySelector('.claim-modal-thumb img')).toHaveAttribute(
      'src',
      'https://img.example/mug.jpg'
    );
    expect(container.querySelector('.claim-modal-price')).toHaveTextContent(
      '$35.50'
    );
  });

  it('NullName_RendersEmptyHeading', () => {
    const { container } = render(
      <PurchaseModalHeader item={makeItem({ name: null })} />
    );
    expect(container.querySelector('h2')).toHaveTextContent('');
  });

  it('NoImageNoStores_OmitsThumbnailImageAndPrice', () => {
    const { container } = render(<PurchaseModalHeader item={makeItem()} />);
    expect(
      screen.getByRole('heading', { name: 'Fancy Mug' })
    ).toBeInTheDocument();
    expect(container.querySelector('.claim-modal-thumb img')).toBeNull();
    expect(container.querySelector('.claim-modal-price')).toBeNull();
  });
});
