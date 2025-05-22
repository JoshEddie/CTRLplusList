import { FormInput, FormLabel } from '@/app/ui/components/Form/Form';
import { ItemDetails } from '@/lib/types';

export function StoreInputContainer({
  itemForm,
  setItemForm,
}: {
  itemForm: ItemDetails;
  setItemForm: React.Dispatch<React.SetStateAction<ItemDetails>>;
}) {
  return (
    <>
      <StoreInput
        required
        index={0}
        itemForm={itemForm}
        setItemForm={setItemForm}
      />
      <StoreInput index={1} itemForm={itemForm} setItemForm={setItemForm} />
      <StoreInput index={2} itemForm={itemForm} setItemForm={setItemForm} />
    </>
  );
}

export function StoreInput({
  required = false,
  index,
  itemForm,
  setItemForm,
}: {
  required?: boolean;
  index: number;
  itemForm: ItemDetails;
  setItemForm: React.Dispatch<React.SetStateAction<ItemDetails>>;
}) {
  return (
    <div className="store-input-container">
      <div className="store-input">
        <FormLabel>Store {required ? '*' : ''}</FormLabel>
        <FormInput
          name="store"
          value={itemForm.stores[index]?.name || ''}
          required={required}
          onChange={(e) => {
            const updatedStores = [...itemForm.stores];
            updatedStores[index] = {
              ...updatedStores[index],
              name: e.target.value,
            };
            setItemForm({
              ...itemForm,
              stores: updatedStores,
            });
          }}
        />
      </div>
      <div className="store-input">
        <FormLabel>Price {required ? '*' : ''}</FormLabel>
        <FormInput
          name="price"
          value={itemForm.stores[index]?.price || ''}
          required={required}
          onChange={(e) => {
            const updatedStores = [...itemForm.stores];
            updatedStores[index] = {
              ...updatedStores[index],
              price: e.target.value,
            };
            setItemForm({
              ...itemForm,
              stores: updatedStores,
            });
          }}
        />
      </div>
      <div className="store-input">
        <FormLabel>Link {required ? '*' : ''}</FormLabel>
        <FormInput
          name="link"
          value={itemForm.stores[index]?.link || ''}
          required={required}
          onChange={(e) => {
            const updatedStores = [...itemForm.stores];
            updatedStores[index] = {
              ...updatedStores[index],
              link: e.target.value,
            };
            setItemForm({
              ...itemForm,
              stores: updatedStores,
            });
          }}
        />
      </div>
    </div>
  );
}
