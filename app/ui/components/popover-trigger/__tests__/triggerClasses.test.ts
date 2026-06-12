import { describe, expect, it } from 'vitest';
import { triggerClasses } from '../triggerClasses';

describe('triggerClasses', () => {
  it('NoArgs_ReturnsBaseToken', () => {
    expect(triggerClasses()).toBe('popover-trigger');
  });

  it('EmptyObject_ReturnsBaseToken', () => {
    expect(triggerClasses({})).toBe('popover-trigger');
  });

  it('ToneLight_ReturnsBaseToken', () => {
    expect(triggerClasses({ tone: 'light' })).toBe('popover-trigger');
  });

  it('ToneOnDark_AppendsToneOnDark', () => {
    expect(triggerClasses({ tone: 'on-dark' })).toBe(
      'popover-trigger tone-on-dark'
    );
  });

  it('ActiveTrue_AppendsActive', () => {
    expect(triggerClasses({ active: true })).toBe('popover-trigger active');
  });

  it('ActiveFalse_NoActiveToken', () => {
    expect(triggerClasses({ active: false })).toBe('popover-trigger');
  });

  it('ToneOnDarkPlusActive_BothInOrder', () => {
    expect(triggerClasses({ tone: 'on-dark', active: true })).toBe(
      'popover-trigger tone-on-dark active'
    );
  });

  it('AllArgs_BaseToneActiveExtraInOrder', () => {
    expect(
      triggerClasses({ tone: 'on-dark', active: true, extra: 'foo' })
    ).toBe('popover-trigger tone-on-dark active foo');
  });

  it('LightPlusActivePlusExtra_BaseActiveExtra', () => {
    expect(triggerClasses({ tone: 'light', active: true, extra: 'foo' })).toBe(
      'popover-trigger active foo'
    );
  });

  it('EmptyExtra_Filtered', () => {
    expect(triggerClasses({ extra: '' })).toBe('popover-trigger');
  });

  it('UndefinedExtra_Filtered', () => {
    expect(triggerClasses({ extra: undefined })).toBe('popover-trigger');
  });
});
