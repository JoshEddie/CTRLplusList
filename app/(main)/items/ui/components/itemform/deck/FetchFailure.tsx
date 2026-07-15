import { Button } from '@/app/ui/components/button';

export type FailureKind = 'timeout' | 'failed';

interface FetchFailureProps {
  kind: FailureKind;
  canRetrySame: boolean;
  onRetrySame: () => void;
  onTryDifferent: () => void;
  onManual: () => void;
}

function copyFor(kind: FailureKind, canRetrySame: boolean) {
  if (!canRetrySame) {
    return {
      title: 'That link keeps failing',
      sub: 'Try a different one, or fill in the details manually.',
    };
  }
  if (kind === 'timeout') {
    return {
      title: 'This is taking longer than expected',
      sub: 'The link may still work — a retry often does it.',
    };
  }
  return {
    title: "We couldn't load that link",
    sub: 'It might be the link, or a hiccup on our end.',
  };
}

// Kind-aware failure screen (D10): copy and actions match the failure cause,
// never blaming the link for a slow fetch. Attempt-aware — after the same-link
// retry cap, "Try again" is withdrawn and the copy hardens.
export function FetchFailure({
  kind,
  canRetrySame,
  onRetrySame,
  onTryDifferent,
  onManual,
}: FetchFailureProps) {
  const { title, sub } = copyFor(kind, canRetrySame);
  return (
    <div className="deck-failure deck-body">
      <h2 className="deck-failure-title">{title}</h2>
      <p className="deck-failure-sub">{sub}</p>
      <div className="deck-failure-actions">
        {canRetrySame && (
          <Button variant="primary" onClick={onRetrySame}>
            Try again
          </Button>
        )}
        <Button
          variant={canRetrySame ? 'secondary' : 'primary'}
          onClick={onTryDifferent}
        >
          Try a different link
        </Button>
        <Button variant="link" onClick={onManual}>
          Fill in details manually →
        </Button>
      </div>
    </div>
  );
}
