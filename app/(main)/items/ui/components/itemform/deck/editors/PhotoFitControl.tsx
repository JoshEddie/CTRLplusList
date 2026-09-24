'use client';

import {
  SegmentedControl,
  SegmentedOption,
} from '@/app/ui/components/segmented-control';
import { getMessage } from '@/lib/i18n/utils';
import type { ImageFit, ImageFraming } from '@/lib/imageFraming';

export default function PhotoFitControl({
  framing,
  onChange,
  disabled,
}: {
  framing: ImageFraming;
  onChange: (framing: ImageFraming) => void;
  disabled?: boolean;
}) {
  return (
    <div className="deck-photo-fit">
      <SegmentedControl<ImageFit>
        value={framing.fit}
        onChange={(fit) => onChange({ ...framing, fit })}
        tone="light"
        aria-label={getMessage('photo_fit_label')}
      >
        <SegmentedOption value="cover" disabled={disabled}>
          {getMessage('photo_fit_fill')}
        </SegmentedOption>
        <SegmentedOption value="contain" disabled={disabled}>
          {getMessage('photo_fit_fit')}
        </SegmentedOption>
      </SegmentedControl>
      {framing.fit === 'cover' && (
        <p className="deck-photo-hint">{getMessage('photo_focal_hint')}</p>
      )}
    </div>
  );
}
