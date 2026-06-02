import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PurchaseFlow from '../PurchaseFlow';

describe('PurchaseFlow', () => {
  it('PrimaryTextAndChildren_RenderWithoutSecondaryParagraph', () => {
    render(
      <PurchaseFlow primary_text="Did you purchase this item?">
        <button type="button">Yes</button>
      </PurchaseFlow>
    );
    expect(screen.getByText('Did you purchase this item?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
    expect(
      screen.queryByText('A clarifying second line')
    ).not.toBeInTheDocument();
  });

  it('SecondaryText_RendersSecondParagraph', () => {
    render(
      <PurchaseFlow
        primary_text="Primary line"
        secondary_text="A clarifying second line"
      >
        <span>child</span>
      </PurchaseFlow>
    );
    expect(screen.getByText('A clarifying second line')).toBeInTheDocument();
  });
});
