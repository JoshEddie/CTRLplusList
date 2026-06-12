'use client';

import { Button, LinkButton } from '@/app/ui/components/button';

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container error-boundary">
      <h3>Something went wrong</h3>
      <p>
        An unexpected error occurred while loading this page. It may be
        temporary — try again.
      </p>
      <div className="error-boundary-actions">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <LinkButton href="/" variant="secondary">
          Go home
        </LinkButton>
      </div>
      {error.digest && (
        <p className="error-boundary-digest">Error reference: {error.digest}</p>
      )}
    </div>
  );
}
