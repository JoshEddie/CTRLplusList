import { describe, expect, it } from 'vitest';
import { menuItemClasses } from '../menuClasses';

describe('menuItemClasses', () => {
  describe('ClassComposition', () => {
    it('NoArgs_ReturnsBaseToken', () => {
      expect(menuItemClasses()).toBe('menu-item');
    });

    it('EmptyObject_ReturnsBaseToken', () => {
      expect(menuItemClasses({})).toBe('menu-item');
    });

    it('ToneDefault_ReturnsBaseToken', () => {
      expect(menuItemClasses({ tone: 'default' })).toBe('menu-item');
    });

    it('ToneDanger_AppendsToneDanger', () => {
      expect(menuItemClasses({ tone: 'danger' })).toBe('menu-item tone-danger');
    });

    it('ToneDefaultPlusExtra_AppendsExtra', () => {
      expect(menuItemClasses({ tone: 'default', extra: 'foo' })).toBe(
        'menu-item foo'
      );
    });

    it('ToneDangerPlusExtra_AppendsBothInOrder', () => {
      expect(menuItemClasses({ tone: 'danger', extra: 'foo' })).toBe(
        'menu-item tone-danger foo'
      );
    });

    it('EmptyExtra_Filtered', () => {
      expect(menuItemClasses({ extra: '' })).toBe('menu-item');
    });

    it('UndefinedExtra_Filtered', () => {
      expect(menuItemClasses({ extra: undefined })).toBe('menu-item');
    });
  });
});
