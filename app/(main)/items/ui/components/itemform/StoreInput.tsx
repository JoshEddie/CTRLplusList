import { FormInput, FormLabel } from '@/app/ui/components/Form/Form';
import { ItemDetails } from '@/lib/types';
import { FaPlus } from 'react-icons/fa';
import { IoMdRemove } from 'react-icons/io';
import { LuDollarSign } from 'react-icons/lu';

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

export function StoreInputContainer({
  itemForm,
  itemFormErrors,
  handleStoreChange,
  handleStoreAdd,
  handleStoreRemove,
}: {
  itemForm: ItemDetails;
  itemFormErrors: ItemFormErrors;
  handleStoreChange: (
    index: number,
    value: string | number,
    type: 'name' | 'price' | 'link'
  ) => void;
  handleStoreAdd: (index: number) => void;
  handleStoreRemove: (index: number) => void;
}) {

  return (
    <>
      <FormLabel>Stores/Prices</FormLabel>
      <div className="stores-input-container">
      {itemForm.stores.map((store, index) => {
          return (
            <div key={index} className="store-input-wrapper">
              <StoreInput
                index={index}
                itemForm={itemForm}
                itemFormErrors={itemFormErrors}
                handleStoreChange={handleStoreChange}
              />
              {itemForm.stores.length > 1 && (
                <button 
                  type="button" 
                  className="remove-store-btn"
                  onClick={() => handleStoreRemove(index)}
                  aria-label={`Remove store ${index + 1}`}
                >
                  <IoMdRemove />
                </button>
              )}
            </div>
          );
        })}
        <button 
          type="button" 
          className="add-store-btn"
          onClick={() => handleStoreAdd(itemForm.stores.length)}
        >
          <FaPlus size={18} className="add-store-icon"/>
          Add Store
        </button>
      </div>
    </>
  );
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
          <div className="input-error">
            {itemFormErrors.stores[index]?.name}
          </div>
      </div>
      <div className="store-input">
        <FormLabel>Price {required ? '*' : ''}</FormLabel>
          <div className={`price-input-container ${itemFormErrors.stores[index]?.price ? 'form-input-error' : ''}`}>
            <LuDollarSign size={20} />
            <FormInput
              name="price"
              type="text"
              inputMode="decimal"
              value={itemForm.stores[index]?.price || ''}
              placeholder="0.00"
              required={required}
              onChange={(e) => {
                handleStoreChange(index, e.target.value, 'price');
              }}
              autoComplete="off"
            />
          </div>
          <div className="input-error">
            {itemFormErrors.stores[index]?.price}
          </div>
      </div>
      <div className="store-input">
        <FormLabel>Link {required ? '*' : ''}</FormLabel>
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
          <div className="input-error">
            {itemFormErrors.stores[index]?.link}
          </div>
      </div>
    </div>
  );
}
