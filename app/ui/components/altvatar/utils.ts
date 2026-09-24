import type { CanonicalAxis } from '@/lib/altvatar/types';
import { COLOR_AXES, ENUM_AXES } from '@/lib/altvatar/vocabulary';

export type TileArt = Record<string, string>;

export function labelOfAxis(axis: CanonicalAxis): string {
  return Object.hasOwn(COLOR_AXES, axis)
    ? COLOR_AXES[axis as keyof typeof COLOR_AXES].label
    : ENUM_AXES[axis as keyof typeof ENUM_AXES].label;
}
