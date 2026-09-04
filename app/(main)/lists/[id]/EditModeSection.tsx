import type { ReactNode } from 'react';

export default function EditModeSection({
  kind,
  title,
  hint,
  empty,
  children,
}: {
  kind: 'in' | 'out';
  title: string;
  hint?: string;
  /** Replaces the rows when there are none to show. */
  empty?: string;
  children?: ReactNode;
}) {
  const headingId = `edit-mode-section-${kind}`;
  return (
    <section
      className={`edit-mode-section edit-mode-section--${kind}`}
      aria-labelledby={headingId}
    >
      <div className="edit-mode-section-head">
        <h2 id={headingId} className="edit-mode-section-title">
          {title}
        </h2>
        {hint && <p className="edit-mode-section-hint">{hint}</p>}
      </div>
      {empty && <p className="edit-mode-section-empty">{empty}</p>}
      {children}
    </section>
  );
}
