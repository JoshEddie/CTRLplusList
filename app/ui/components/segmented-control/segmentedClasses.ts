import type { SegmentedTone } from './types';

export function segmentedGroupClasses({
  tone,
  extra,
}: {
  tone: SegmentedTone;
  extra?: string;
}): string {
  return ['segmented', `tone-${tone}`, extra].filter(Boolean).join(' ');
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
