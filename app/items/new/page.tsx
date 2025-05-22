import ItemFormLoading from '@/app/items/ui/components/ItemFormLoading';
import Header from '@/app/ui/components/Header';
import Link from 'next/link';
import { Suspense } from 'react';
import { BsArrowLeftShort } from 'react-icons/bs';
import ItemFormContainer from '../ui/components/ItemFormContainer';

const NewItem = async () => {
  return (
    <>
      <Header title="New Item">
        <Link className="btn primary" href="/items">
          <BsArrowLeftShort size={20} />
          Back to Items
        </Link>
      </Header>
      <Suspense fallback={<ItemFormLoading />}>
        <ItemFormContainer />
      </Suspense>
    </>
  );
};

export default NewItem;
