'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, arial, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          textAlign: 'center',
          padding: '20px',
        }}
      >
        <h1 style={{ fontWeight: 400 }}>Something went wrong</h1>
        <p>
          An unexpected error occurred. It may be temporary — try again.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        {error.digest && (
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Error reference: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
