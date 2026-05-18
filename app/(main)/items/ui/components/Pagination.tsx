'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import PageSizeSelect from './PageSizeSelect';

export { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from './paginationConstants';

interface PaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  onPageSizeChange: (next: number) => void;
}

function buildRange(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const result: (number | 'gap')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) result.push('gap');
  for (let i = start; i <= end; i++) result.push(i);
  if (end < totalPages - 1) result.push('gap');
  result.push(totalPages);
  return result;
}

export default function Pagination({
  page,
  totalPages,
  pageSize,
  onPageSizeChange,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (next: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const range = buildRange(page, totalPages);

  return (
    <nav className="items-pagination" aria-label="Pagination">
      <button
        type="button"
        className="items-page-btn"
        onClick={() => goToPage(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <MdChevronLeft />
      </button>
      {range.map((entry, idx) =>
        entry === 'gap' ? (
          <span key={`gap-${idx}`} className="items-page-gap" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            className={`items-page-btn ${entry === page ? 'active' : ''}`}
            onClick={() => goToPage(entry)}
            aria-current={entry === page ? 'page' : undefined}
            aria-label={`Page ${entry}`}
          >
            {entry}
          </button>
        )
      )}
      <button
        type="button"
        className="items-page-btn"
        onClick={() => goToPage(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <MdChevronRight />
      </button>
      <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
    </nav>
  );
}
