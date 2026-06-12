import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PurchasesSelect } from '../PurchasesSelect';

describe('PurchasesSelect', () => {
  describe('Options', () => {
    it('ItemsMode_RendersHideRevealOnlyNone', () => {
      render(
        <PurchasesSelect mode="items" purchases="hide" onChange={vi.fn()} />
      );
      const select = screen.getByRole('combobox', { name: 'Purchases filter' });
      expect(
        within(select)
          .getAllByRole('option')
          .map((o) => o.textContent)
      ).toEqual([
        'Hide purchases',
        'Reveal purchases',
        'Only purchased',
        'Only not purchased',
      ]);
    });

    it('ListMode_OmitsRevealOption', () => {
      render(
        <PurchasesSelect mode="list" purchases="hide" onChange={vi.fn()} />
      );
      const select = screen.getByRole('combobox', { name: 'Purchases filter' });
      expect(
        within(select)
          .getAllByRole('option')
          .map((o) => o.textContent)
      ).toEqual(['All', 'Only purchased', 'Only not purchased']);
    });
  });

  describe('Change', () => {
    it('Selection_CallsOnChangeWithValue', () => {
      const onChange = vi.fn();
      render(
        <PurchasesSelect mode="items" purchases="hide" onChange={onChange} />
      );
      fireEvent.change(
        screen.getByRole('combobox', { name: 'Purchases filter' }),
        { target: { value: 'only' } }
      );
      expect(onChange).toHaveBeenCalledWith('only');
    });

    it('Value_ReflectedInSelect', () => {
      render(
        <PurchasesSelect mode="items" purchases="only" onChange={vi.fn()} />
      );
      expect(
        (
          screen.getByRole('combobox', {
            name: 'Purchases filter',
          }) as HTMLSelectElement
        ).value
      ).toBe('only');
    });
  });
});
