import type { CSSProperties } from 'react';
import './progress-disc.css';

// A fraction as a filled disc, painted in `currentColor` so it takes the
// colour of the line it sits on. Decorative: whatever the disc shows, the text
// beside it states.
export default function ProgressDisc({ value }: { value: number }) {
  return (
    <div className="progress-disc" aria-hidden>
      <span
        className="progress-disc-inside"
        // Clamped here rather than at the callers: a disc cannot sweep past a
        // full turn, so out-of-range input is the disc's to absorb.
        style={
          { '--progress': Math.max(0, Math.min(value, 1)) } as CSSProperties
        }
      />
    </div>
  );
}
