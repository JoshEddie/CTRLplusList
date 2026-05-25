import './loading-indicator.css';

type LoadingIndicatorSize = 'inline' | 'rail' | 'form' | 'page';

interface LoadingIndicatorProps {
  size: LoadingIndicatorSize;
}

export default function LoadingIndicator({ size }: LoadingIndicatorProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`loading-indicator loading-indicator--${size}`}
    >
      <span className="loading-indicator__spinner" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
