import { Suspense } from 'react';
import ItemLoading from './ui/components/ItemLoading';
import ItemsContainer from './ui/components/ItemsContainer';

export default async function Home() {
  return (
    <div className="items-container">
      <Suspense fallback={<ItemLoading />}>
        <ItemsContainer />
      </Suspense>
    </div>
  );
}
