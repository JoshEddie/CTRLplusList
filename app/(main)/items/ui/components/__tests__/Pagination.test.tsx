/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The ellipsis gaps render as aria-hidden `.items-page-gap` spans (not in the
 * a11y tree) and the page-size select must be asserted as a descendant of the
 * `nav.items-pagination`; both require structural queries.
 */
import { render, screen, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Pagination from '../Pagination';

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: '/items',
  search: '',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

beforeEach(() => {
  nav.replace.mockReset();
  nav.pathname = '/items';
  nav.search = '';
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderPagination(page: number, totalPages: number) {
  return render(
    <Pagination
      page={page}
      totalPages={totalPages}
      pageSize={24}
      onPageSizeChange={vi.fn()}
    />
  );
}

function pageLabels() {
  return screen
    .getAllByRole('button', { name: /^Page \d+$/ })
    .map((b) => b.textContent);
}

describe('Pagination', () => {
  describe('Range', () => {
    it('SevenOrFewerPages_RendersEveryPageNoGap', () => {
      const { container } = renderPagination(1, 5);
      expect(pageLabels()).toEqual(['1', '2', '3', '4', '5']);
      expect(container.querySelectorAll('.items-page-gap')).toHaveLength(0);
    });

    it('MoreThanSevenMidRange_RendersFirstGapWindowGapLast', () => {
      const { container } = renderPagination(10, 20);
      expect(pageLabels()).toEqual(['1', '9', '10', '11', '20']);
      expect(container.querySelectorAll('.items-page-gap')).toHaveLength(2);
    });

    it('WindowNearStart_OmitsLeadingGap', () => {
      const { container } = renderPagination(2, 20);
      expect(pageLabels()).toEqual(['1', '2', '3', '20']);
      expect(container.querySelectorAll('.items-page-gap')).toHaveLength(1);
    });

    it('WindowNearEnd_OmitsTrailingGap', () => {
      const { container } = renderPagination(19, 20);
      expect(pageLabels()).toEqual(['1', '18', '19', '20']);
      expect(container.querySelectorAll('.items-page-gap')).toHaveLength(1);
    });
  });

  describe('CurrentPage', () => {
    it('CurrentPage_HasAriaCurrentAndPrimaryVariant', () => {
      renderPagination(3, 5);
      const current = screen.getByRole('button', { name: 'Page 3' });
      expect(current).toHaveAttribute('aria-current', 'page');
      expect(current).toHaveClass('primary');
      const other = screen.getByRole('button', { name: 'Page 2' });
      expect(other).not.toHaveAttribute('aria-current');
      expect(other).toHaveClass('ghost');
    });
  });

  describe('Bounds', () => {
    it('FirstPage_PreviousDisabled', () => {
      renderPagination(1, 5);
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    });

    it('LastPage_NextDisabled', () => {
      renderPagination(5, 5);
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Previous page' })
      ).toBeEnabled();
    });
  });

  describe('Navigation', () => {
    it('ClickPageGreaterThanOne_ReplaceSetsPageParam', () => {
      renderPagination(1, 5);
      fireEvent.click(screen.getByRole('button', { name: 'Page 3' }));
      expect(nav.replace).toHaveBeenCalledWith('/items?page=3');
    });

    it('PreviousFromPageTwo_ReplaceRemovesPageParam', () => {
      nav.search = 'page=2';
      renderPagination(2, 5);
      fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
      expect(nav.replace).toHaveBeenCalledWith('/items');
    });

    it('NextFromPageOne_ReplaceSetsPageParam', () => {
      renderPagination(1, 5);
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      expect(nav.replace).toHaveBeenCalledWith('/items?page=2');
    });
  });

  describe('Composition', () => {
    it('Render_PageSizeSelectInsidePaginationNav', () => {
      renderPagination(1, 5);
      const paginationNav = screen.getByRole('navigation', {
        name: 'Pagination',
      });
      expect(
        within(paginationNav).getByRole('combobox', { name: 'Items per page' })
      ).toBeInTheDocument();
    });
  });
});
