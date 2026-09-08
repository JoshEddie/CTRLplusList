import type { StagedEntry } from '../editModeChanges';

export const entry = (item_id: string, quantity = 1): StagedEntry => ({
  item_id,
  quantity,
});
