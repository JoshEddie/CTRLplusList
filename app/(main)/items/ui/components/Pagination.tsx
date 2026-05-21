'use client';

import { Button } from '@/app/ui/components/button';
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
      <Button
        variant="ghost"
        size="sm"
        onClick={() => goToPage(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <MdChevronLeft />
      </Button>
      {range.map((entry, idx) =>
        entry === 'gap' ? (
          <span key={`gap-${idx}`} className="items-page-gap" aria-hidden>
            …
          </span>
        ) : (
          <Button
            key={entry}
            variant={entry === page ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => goToPage(entry)}
            aria-current={entry === page ? 'page' : undefined}
            aria-label={`Page ${entry}`}
          >
            {entry}
          </Button>
        )
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => goToPage(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <MdChevronRight />
      </Button>
      <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
    </nav>
  );
}
