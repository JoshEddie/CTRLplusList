'use client';

import { LinkButton } from '@/app/ui/components/button';
import { PriceField } from '@/app/ui/components/field';
import { amountToPrice, priceToAmount } from '../utils';

interface PriceEditorProps {
  price: string;
  onChange: (value: string) => void;
  /** The pasted/store product page, opened so the user can read a price we
   *  couldn't pull. */
  productUrl?: string;
  disabled?: boolean;
}

export function PriceEditor({
  price,
  onChange,
  productUrl,
  disabled,
}: PriceEditorProps) {
  return (
    <div className="deck-price">
      <PriceField
        label="Price"
        amount={priceToAmount(price)}
        onChange={(value) => onChange(amountToPrice(value))}
        onClear={() => onChange('')}
        disabled={disabled}
      />
      {productUrl && (
        <LinkButton
          variant="link"
          href={productUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Couldn&apos;t pull the price — open the product page ↗
        </LinkButton>
      )}
    </div>
  );
}
