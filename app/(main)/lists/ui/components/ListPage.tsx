import Header from "@/app/ui/components/Header";
import Link from "next/link";
import { Suspense } from "react";
import { FaPlus } from "react-icons/fa";
import List from "./List";
import ListLoading from "./ListLoading";

import '../styles/list.css';

export default function ListPage() {
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