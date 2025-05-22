import Header from '@/app/ui/components/Header';
import Link from 'next/link';
import { FaPlus } from 'react-icons/fa';
import ItemsContainer from './ui/components/ItemsContainer';

export default async function Home() {
  return (
    <div className="item-container">
      <Header title="Items">
        <Link className="btn primary" href="/items/new">
          <FaPlus size={14} />
          New Item
        </Link>
      </Header>
      <ItemsContainer showEditButton={true} />
    </div>
  );
}
