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

function buildRange(page: number, totalPages: number): number[] {
  return [...new Set([1, page, totalPages])].sort((a, b) => a - b);
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
      {range.map((entry) => (
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
      ))}
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
