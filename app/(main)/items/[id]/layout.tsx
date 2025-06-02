import Header from '@/app/ui/components/Header';
import { Suspense } from 'react';
import ItemFormLoading from '../ui/components/itemform/ItemFormLoading';

const EditItemLayout = async ({ children }: { children: React.ReactNode }) => {

  return (
    <>
      <Suspense fallback={
        <>
          <Header title="Edit Item" />
          <ItemFormLoading />
        </>}>
        {children}
      </Suspense>
    </>
  );
};

export default EditItemLayout;
