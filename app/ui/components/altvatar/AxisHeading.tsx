import type { CanonicalAxis } from '@/lib/altvatar/types';
import { labelOfAxis } from './utils';

export default function AxisHeading({
  axis,
  value,
}: {
  axis: CanonicalAxis;
  value: string;
}) {
  return (
    <div className="altvatar-axis-hd">
      <h2 className="altvatar-axis-title">{labelOfAxis(axis)}</h2>
      <span className="altvatar-axis-value">{value}</span>
    </div>
  );
}
