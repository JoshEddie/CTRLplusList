import Header from '@/app/ui/components/Header';
import Link from 'next/link';
import { Suspense } from 'react';
import ItemFormLoading from '../ui/components/ItemFormLoading';

const EditItemLayout = async ({ children }: { children: React.ReactNode }) => {

  return (
    <>
      <Header title="Edit Item">
        <Link className="btn primary" href="/items">
          Back to Items
        </Link>
      </Header>
      <Suspense fallback={<ItemFormLoading />}>
        {children}
      </Suspense>
    </>
  );
};

export default EditItemLayout;
