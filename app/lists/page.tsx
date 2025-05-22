import Header from '@/app/ui/components/Header';
import Link from 'next/link';
import { Suspense } from 'react';
import { FaPlus } from 'react-icons/fa';
import List from './ui/components/List';
import ListLoading from './ui/components/ListLoading';
import './ui/styles/list-loading.css';
import './ui/styles/list.css';

export default async function Home() {
  return (
    <div className="list-container">
      <Header title="Lists">
        <Link className="btn primary" href="/lists/new">
          <FaPlus size={14} />
          New List
        </Link>
      </Header>
      <Suspense fallback={<ListLoading />}>
        <List />
      </Suspense>
    </div>
  );
}
