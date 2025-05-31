import { FormInput, FormLabel } from '@/app/ui/components/Form/Form';
import TooltipWrapper from '@/app/ui/components/TooltipWrapper';
import { ItemDetails } from '@/lib/types';
import { PiCurrencyDollarLight } from 'react-icons/pi';

interface ItemFormErrors {
  name: string;
  image_url: string;
  quantity_limit: string;
  stores: {
    name: string;
    link: string;
    price: string;
  }[];
}
interface StoreInputProps {
  required?: boolean;
  index: number;
  itemForm: ItemDetails;
  itemFormErrors: ItemFormErrors;
  handleStoreChange: (
    index: number,
    value: string | number,
    type: 'name' | 'price' | 'link'
  ) => void;
}

export function StoreInputContainer({
  itemForm,
  itemFormErrors,
  handleStoreChange,
}: {
  itemForm: ItemDetails;
  itemFormErrors: ItemFormErrors;
  handleStoreChange: (
    index: number,
    value: string | number,
    type: 'name' | 'price' | 'link'
  ) => void;
}) {
  return (
    <>
      <FormLabel>Stores/Prices</FormLabel>
      <div className="stores-input-container">
        <StoreInput
          index={0}
          itemForm={itemForm}
          itemFormErrors={itemFormErrors}
          handleStoreChange={handleStoreChange}
        />
        <StoreInput
          index={1}
          itemForm={itemForm}
          itemFormErrors={itemFormErrors}
          handleStoreChange={handleStoreChange}
        />
        <StoreInput
          index={2}
          itemForm={itemForm}
          itemFormErrors={itemFormErrors}
          handleStoreChange={handleStoreChange}
        />
      </div>
    </>
  );
}

export function StoreInput({
  required = false,
  index,
  itemForm,
  itemFormErrors,
  handleStoreChange,
}: StoreInputProps) {
  return (
    <div className="store-input-container">
      <div className="store-input">
        <FormLabel>Store {required ? '*' : ''}</FormLabel>
        <TooltipWrapper
          className={`input-tooltip ${itemFormErrors.stores[index]?.name ? 'form-error' : ''}`}
          tooltip={itemFormErrors.stores[index]?.name as string}
        >
          <FormInput
            name="store"
            value={itemForm.stores[index]?.name || ''}
            placeholder="Ctrl + List"
            required={required}
            onChange={(e) => {
              handleStoreChange(index, e.target.value, 'name');
            }}
            className={
              itemFormErrors.stores[index]?.name ? 'form-input-error' : ''
            }
            autoComplete="off"
          />
        </TooltipWrapper>
      </div>
      <div className="store-input">
        <FormLabel>Price {required ? '*' : ''}</FormLabel>
        <TooltipWrapper
          className={`input-tooltip ${itemFormErrors.stores[index]?.price ? 'form-error' : ''}`}
          tooltip={itemFormErrors.stores[index]?.price as string}
        >
          <div className="price-input-container">
            <PiCurrencyDollarLight size={36} />
            <FormInput
              name="price"
              type="tel"
              value={itemForm.stores[index]?.price || ''}
              placeholder="0.00"
              required={required}
              onChange={(e) => {
                handleStoreChange(index, e.target.value, 'price');
              }}
              className={`${itemFormErrors.stores[index]?.price ? 'form-input-error' : ''}`}
              autoComplete="off"
            />
          </div>
        </TooltipWrapper>
      </div>
      <div className="store-input">
        <FormLabel>Link {required ? '*' : ''}</FormLabel>
        <TooltipWrapper
          className={`input-tooltip ${itemFormErrors.stores[index]?.link ? 'form-error' : ''}`}
          tooltip={itemFormErrors.stores[index]?.link as string}
        >
          <FormInput
            name="link"
            value={itemForm.stores[index]?.link || ''}
            placeholder="https://CtrlPlusList.com"
            required={required}
            onChange={(e) => {
              handleStoreChange(index, e.target.value, 'link');
            }}
            className={
              itemFormErrors.stores[index]?.link ? 'form-input-error' : ''
            }
            autoComplete="off"
          />
        </TooltipWrapper>
      </div>
    </div>
  );
}
