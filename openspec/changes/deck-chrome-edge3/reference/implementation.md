# Implementation reference — exact code for the Edge 3.0 chrome + tracker

Paint-by-numbers for the **net-new** surface (shell, header, well, footer, tracker, scroll-shadow, collapse). Well *content* is reused per design.md D6 — not here. All values are app tokens; the `/* mock */` comment shows the mock's raw value the token replaces (design.md D8). Geometry matches the mock exactly. This is a reference to transcribe, not a second source of truth — design.md governs.

Resolved token values (for sanity): `--primary-color #7324ce` · `--primary-color-light #cda2ff` · `--neutral-text-color #1f2937` · `--muted-text-color #6b7280` · `--neutral-border-color #d1d5db` · `--light-color #fff` · `--success-text #059669` · `--card-border-color #ebebf5` · `--WCAG-input-size 44px`.

## CSS — `deck-screen.css`

```css
/* ---- shell + 3 regions ---- */
.deck-screen {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: calc(100dvh - var(--app-sticky-top, 60px) - 48px); /* dvh, not vh */
  background: var(--light-color);
  border-radius: 20px;                 /* mock 20px */
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.22);
}

.deck-screen-hd {                       /* pinned header */
  flex: none;
  padding: 20px 22px 18px;              /* mock 20/22/18 */
}
.deck-screen-eyebrow {                  /* "ADD AN ITEM" — flow name */
  color: var(--primary-color);         /* mock #6d28d9 */
  font-weight: 700;
  letter-spacing: 0.06em;
  font-size: 14px;
  text-transform: uppercase;
}
.deck-screen-title {                    /* per-screen h2 */
  margin-top: 11px;
  font-size: 27px;
  line-height: 1.1;
  font-weight: 700;
  color: var(--neutral-text-color);    /* mock #111827 */
}
.deck-screen-sub {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.4;
  color: var(--muted-text-color);      /* mock #6b7280 */
}

.deck-screen-well {                     /* the scroller */
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  background: var(--deck-well-bg);      /* mock #f6f5fb — see Q4; reuse or 1 new token */
  padding: 6px 22px 22px;              /* mock 6/22/22 (tight top; header gives space) */
}

.deck-screen-ft {                       /* pinned footer */
  flex: none;
  padding: 16px 22px 18px;             /* mock 16/22/18 */
  background: var(--light-color);
  border-top: 1px solid var(--card-border-color); /* mock #ece9f6 */
}

/* ---- floating close: mirror the item-card kebab (item.css:243) ---- */
.deck-screen-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;                          /* mock 32 */
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);          /* kebab treatment */
  border: 1px solid rgba(0, 0, 0, 0.07);          /* kebab treatment */
  color: var(--muted-text-color);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.14);      /* kebab treatment */
  z-index: 4;
}
.deck-screen-close::before {            /* 44px hit target over a 32px visual */
  content: '';
  position: absolute;
  inset: -6px;
}
.deck-screen-close:hover {
  color: var(--primary-color);
  background: var(--light-color);
}

/* ---- scroll shadows (no JS) ---- */
.deck-screen-well {
  /* top+bottom fade that hides itself at the extremes (background-gradient-cover trick) */
  background:
    linear-gradient(var(--deck-well-bg) 30%, transparent) top / 100% 24px no-repeat,
    linear-gradient(transparent, var(--deck-well-bg) 70%) bottom / 100% 24px no-repeat,
    radial-gradient(farthest-side at 50% 0, rgba(30,17,72,.14), transparent) top / 100% 10px no-repeat,
    radial-gradient(farthest-side at 50% 100%, rgba(30,17,72,.14), transparent) bottom / 100% 10px no-repeat,
    var(--deck-well-bg);
  background-attachment: local, local, scroll, scroll;
}
```

## CSS — tracker (`.deck-steps`)

```css
.deck-steps {
  display: flex;
  align-items: flex-start;
  margin-bottom: 14px;                  /* mock 14 */
}
.deck-step {                            /* every node column */
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  position: relative;
  padding: 11px 0;                      /* expands the 22px node toward the 44px floor */
  background: none;
  border: none;
}
.deck-step-track {                      /* connector; color = node it leads INTO */
  flex: 1;
  height: 2px;
  margin-top: 11px;                     /* aligns to node center (22/2) */
}
.deck-step-node {                       /* the circle */
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  background: var(--light-color);
}
.deck-step-label { font-size: 9px; }

/* done */
.deck-step[data-status='done'] { cursor: pointer; }
.deck-step[data-status='done']:hover { opacity: 0.75; }
.deck-step[data-status='done'] .deck-step-node { background: var(--success-text); color: var(--light-color); }
.deck-step[data-status='done'] .deck-step-label { color: var(--success-text); font-weight: 700; }
.deck-step[data-status='done'] + .deck-step-track,
.deck-step-track[data-into='done'] { background: var(--success-text); }

/* current — OUTLINE (A3C), heavier ring + bold label so it differs from future by weight not just hue */
.deck-step[data-status='current'] .deck-step-node { border: 2px solid var(--primary-color); color: var(--primary-color); }
.deck-step[data-status='current'] .deck-step-label { color: var(--primary-color); font-weight: 700; }
.deck-step-track[data-into='current'] { background: var(--primary-color); }

/* future — thin ring, muted, non-interactive */
.deck-step[data-status='future'] { cursor: not-allowed; }
.deck-step[data-status='future'] .deck-step-node { border: 1px solid var(--neutral-border-color); color: var(--muted-text-color); }
.deck-step[data-status='future'] .deck-step-label { color: var(--muted-text-color); font-weight: 500; }
.deck-step-track[data-into='future'] { background: var(--neutral-border-color); }

@media (max-height: 500px) {            /* short-viewport collapse */
  .deck-screen { overflow-y: auto; }
  .deck-screen-well { overflow: visible; }
  .deck-screen-ft { position: sticky; bottom: 0; }
  /* .deck-screen-close stays position:absolute → pinned */
}
```

## JSX — `DeckScreen.tsx` (slots)

```tsx
export function DeckScreen({
  eyebrow, title, subtitle, foot, onClose, children,
}: {
  eyebrow: string; title?: string; subtitle?: ReactNode;
  foot?: ReactNode; onClose: () => void; children: ReactNode;
}) {
  return (
    <div className="deck-screen">
      <button className="deck-screen-close" aria-label="Close" onClick={onClose}>
        <LuX />
      </button>
      <div className="deck-screen-hd">
        <span className="deck-screen-eyebrow">{eyebrow}</span>
        {title && <h2 className="deck-screen-title">{title}</h2>}
        {subtitle && <p className="deck-screen-sub">{subtitle}</p>}
      </div>
      <div className="deck-screen-well">{children}</div>
      {foot && <div className="deck-screen-ft">{foot}</div>}
    </div>
  );
}
```

## JSX — `StepTracker.tsx`

```tsx
type Status = 'done' | 'current' | 'future';

export function StepTracker({
  steps, index, gated, onJump,
}: {
  steps: { key: string; label: string; complete: boolean }[];
  index: number; gated: boolean; onJump: (i: number) => void;
}) {
  const statusOf = (i: number): Status =>
    i === index ? 'current' : steps[i].complete ? 'done' : 'future';
  const canJump = (i: number, s: Status) =>
    s === 'done' && (i < index || !gated);          // backward always; forward only if not gated

  return (
    <div className="deck-steps" role="group" aria-label="Progress">
      <span className="sr-only">Step {index + 1} of {steps.length}</span>
      {steps.map((step, i) => {
        const s = statusOf(i);
        const Tag = canJump(i, s) ? 'button' : 'div';
        return (
          <Fragment key={step.key}>
            {i > 0 && <span className="deck-step-track" data-into={s} aria-hidden="true" />}
            <Tag
              className="deck-step"
              data-status={s}
              {...(Tag === 'button'
                ? { type: 'button', onClick: () => onJump(i), 'aria-label': `Go back to ${step.label}` }
                : { 'aria-current': s === 'current' ? 'step' : undefined,
                    'aria-disabled': s === 'future' ? true : undefined })}
            >
              <span className="deck-step-node" aria-hidden="true">
                {s === 'done' ? <LuCheck /> : i + 1}
              </span>
              <span className="deck-step-label">{step.label}</span>
            </Tag>
          </Fragment>
        );
      })}
    </div>
  );
}
```

## Footer composition (per DeckCard)

```tsx
<DeckScreen eyebrow="Add an item" title={title} subtitle={subtitle} onClose={dismiss}
  foot={<>
    <StepTracker steps={steps} index={index} gated={stepBlocked(steps[index].key, item)} onJump={setIndex} />
    <Button variant="primary" width="full" onClick={next} disabled={stepBlocked(steps[index].key, item)}>
      Continue <FiArrowRight />
    </Button>
  </>}
>
  {/* reused editor body — e.g. <TitleEditor .../> — NOT rebuilt (D6) */}
</DeckScreen>
```
