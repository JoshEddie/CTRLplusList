import Header from '@/app/ui/components/Header';
import Link from 'next/link';
import { Suspense } from 'react';
import { FaPlus } from 'react-icons/fa';
import List from './ui/components/List';
import ListLoading from './ui/components/ListLoading';
import SavedLists from './ui/components/SavedLists';
import './ui/styles/list-loading.css';
import './ui/styles/list.css';

export default async function Home() {
  return (
    <div className="list-container">
      <Header title="My Lists">
        <Link className="btn primary" href="/lists/new">
          <FaPlus size={14} />
          <span className="mobile-hide">New List</span>
        </Link>
      </Header>
      <Suspense fallback={<ListLoading />}>
        <List />
      </Suspense>

      <Header title="Saved Lists" className="saved-lists" />
      <Suspense fallback={<ListLoading />}>
        <SavedLists />
      </Suspense>
    </div>
  );
}
