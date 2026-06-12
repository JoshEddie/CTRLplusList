import { describe, expect, it } from 'vitest';

import ModalSlotDefault from '../default';

describe('ModalSlotDefault', () => {
  it('Default_ReturnsNull', () => {
    expect(ModalSlotDefault()).toBeNull();
  });
});
