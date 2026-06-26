import { Button } from '@/app/ui/components/button';

interface TimeoutProps {
  onRetry: () => void;
  onManual: () => void;
}

// Shown for a hard fetch failure/timeout (D10). Non-alarming: a retry path and
// a build-by-hand path, never a dead end.
export function Timeout({ onRetry, onManual }: TimeoutProps) {
  return (
    <div className="deck-timeout">
      <h2 className="deck-timeout-title">That link wouldn&apos;t load</h2>
      <p className="deck-timeout-sub">
        We couldn&apos;t pull the product details. Try a different link, or build
        the item by hand.
      </p>
      <div className="deck-timeout-actions">
        <Button variant="primary" onClick={onRetry}>
          Try a different link
        </Button>
        <Button variant="secondary" onClick={onManual}>
          Build it by hand
        </Button>
      </div>
    </div>
  );
}
