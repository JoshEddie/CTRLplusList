import Header from '@/app/ui/components/Header';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { Suspense } from 'react';

const EditItemLayout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Suspense
        fallback={
          <>
            <Header title="Edit Item" />
            <LoadingIndicator size="form" />
          </>
        }
      >
        {children}
      </Suspense>
    </>
  );
};

export default EditItemLayout;
