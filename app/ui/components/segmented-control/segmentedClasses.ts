import type { SegmentedSize, SegmentedTone } from './types';

export function segmentedGroupClasses({
  tone,
  size,
  extra,
}: {
  tone: SegmentedTone;
  size?: SegmentedSize;
  extra?: string;
}): string {
  return ['segmented', `tone-${tone}`, size === 'xs' && 'size-xs', extra]
    .filter(Boolean)
    .join(' ');
}

export function segmentedOptionClasses({
  active,
  extra,
}: {
  active: boolean;
  extra?: string;
}): string {
  return ['segmented-option', active && 'active', extra]
    .filter(Boolean)
    .join(' ');
}
