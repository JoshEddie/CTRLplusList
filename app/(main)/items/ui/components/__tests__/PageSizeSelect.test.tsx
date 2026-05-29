/* eslint-disable testing-library/no-node-access --
 * `fieldSize="sm"` lands as the `form_field-sm` class on the FormField row that
 * wraps the <select>; the only way to assert it reached the field is to walk
 * from the select to its `.form_field` ancestor.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PAGE_SIZE_OPTIONS } from '../paginationConstants';
import PageSizeSelect from '../PageSizeSelect';

describe('PageSizeSelect', () => {
  describe('Options', () => {
    it('Render_OneOptionPerPageSizeValue', () => {
      render(<PageSizeSelect value={24} onChange={vi.fn()} />);
      const select = screen.getByRole('combobox', { name: 'Items per page' });
      const options = screen.getAllByRole('option');
      expect(options.map((o) => o.textContent)).toEqual(
        PAGE_SIZE_OPTIONS.map((n) => `${n} / page`)
      );
      expect((select as HTMLSelectElement).value).toBe('24');
    });
  });

  describe('Change', () => {
    it('Selection_CallsOnChangeWithNumber', () => {
      const onChange = vi.fn();
      render(<PageSizeSelect value={24} onChange={onChange} />);
      fireEvent.change(
        screen.getByRole('combobox', { name: 'Items per page' }),
        { target: { value: '48' } }
      );
      expect(onChange).toHaveBeenCalledWith(48);
      expect(typeof onChange.mock.calls[0][0]).toBe('number');
    });
  });

  describe('Accessibility', () => {
    it('Render_HasItemsPerPageLabelAndSmallSize', () => {
      render(<PageSizeSelect value={12} onChange={vi.fn()} />);
      const select = screen.getByRole('combobox', { name: 'Items per page' });
      expect(select.closest('.form_field')).toHaveClass('form_field-sm');
    });
  });
});
