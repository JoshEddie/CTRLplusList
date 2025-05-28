import Header from '@/app/ui/components/Header';
import Link from 'next/link';
import { Suspense } from 'react';
import { FaPlus } from 'react-icons/fa';
import ItemLoading from './ui/components/ItemLoading';
import ItemsContainer from './ui/components/ItemsContainer';

export default async function Home() {
  return (
    <div className="item-container">
      <Header title="Items">
        <Link className="btn primary" href="/items/new">
          <FaPlus size={14} />
          <span className="mobile-hide">New Item</span>
        </Link>
      </Header>
      <Suspense fallback={<ItemLoading />}>
        <ItemsContainer />
      </Suspense>
    </div>
  );
}
