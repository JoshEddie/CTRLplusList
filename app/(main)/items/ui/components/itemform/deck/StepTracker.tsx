'use client';

// TODO(#343): split the extra components into their own files, then drop this disable
/* eslint-disable react/no-multi-comp */

import { Fragment, useRef, useState } from 'react';
import { LuCheck } from 'react-icons/lu';
import type { DeckStep, DeckStepState } from './neededSteps';

const STEP_LABELS: Record<DeckStep, string> = {
  photo: 'Photo',
  name: 'Name',
  price: 'Price',
  store: 'Store',
  note: 'Note',
};

type Status = 'done' | 'current' | 'future';

interface StepTrackerProps {
  steps: DeckStepState[];
  /** The step whose card is on screen. */
  viewed: number;
  /** Live per-step validity — a valid step reads done (green), an invalid one current (purple). */
  valid: boolean[];
  /** The furthest navigable index: the working step, capped before any broken step. */
  reachableCap: number;
  onJump: (index: number) => void;
}

// Navigational tracker: colour tracks live validity (green done / purple
// current), fill tracks navigability (solid jump target, hollow outline for the
// viewed card, grey when locked). Deliberately NOT in an aria-live region — the
// sr-only text gives position on demand without announcing every advance.
export function StepTracker({
  steps,
  viewed,
  valid,
  reachableCap,
  onJump,
}: StepTrackerProps) {
  const nodes = useRef<(HTMLButtonElement | null)[]>([]);
  const [tabStop, setTabStop] = useState<number | null>(null);

  const statusOf = (i: number): Status =>
    i > reachableCap ? 'future' : valid[i] ? 'done' : 'current';

  // Any node up to the cap is reachable; the cap sits on the working step and
  // never lets a jump land past a step still to be brought into good standing.
  const canJump = (i: number) => i !== viewed && i <= reachableCap;

  const jumpTargets = steps.map((_, i) => i).filter(canJump);

  // The group's single tab stop; falls back when the remembered node is no
  // longer a jump target (e.g. it just became the viewed step).
  const stop =
    tabStop !== null && jumpTargets.includes(tabStop)
      ? tabStop
      : jumpTargets[0];

  // Roving tabindex: the group is one tab stop; arrows move between nodes.
  const moveFocus = (from: number, delta: -1 | 1) => {
    const at = jumpTargets.indexOf(from);
    const to = jumpTargets[at + delta];
    if (to === undefined) return;
    setTabStop(to);
    nodes.current[to]?.focus();
  };

  return (
    <div className="deck-steps" role="group" aria-label="Progress">
      <span className="sr-only">
        Step {viewed + 1} of {steps.length}
      </span>
      {steps.map(({ step }, i) => {
        const status = statusOf(i);
        const label = STEP_LABELS[step];
        const interactive = canJump(i);
        return (
          <Fragment key={step}>
            {i > 0 && (
              <span
                className="deck-step-track"
                data-into={status}
                aria-hidden="true"
              />
            )}
            <button
              ref={(el) => {
                nodes.current[i] = el;
              }}
              type="button"
              className="deck-step"
              data-status={status}
              data-viewed={i === viewed ? 'true' : undefined}
              disabled={!interactive}
              aria-label={
                interactive
                  ? `Go ${i < viewed ? 'back ' : ''}to The ${label}`
                  : `${label} step`
              }
              aria-current={i === viewed ? 'step' : undefined}
              tabIndex={interactive && stop === i ? 0 : -1}
              onClick={interactive ? () => onJump(i) : undefined}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') moveFocus(i, -1);
                if (e.key === 'ArrowRight') moveFocus(i, 1);
              }}
            >
              <StepNode status={status} number={i + 1} />
              <span className="deck-step-label">{label}</span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

function StepNode({ status, number }: { status: Status; number: number }) {
  return (
    <span className="deck-step-node" aria-hidden="true">
      {status === 'done' ? <LuCheck /> : number}
    </span>
  );
}
