'use client';

import AltvatarCustomizer, {
  type AltvatarDraft,
} from '@/app/ui/components/altvatar/AltvatarCustomizer';
import AltvatarPreview from '@/app/ui/components/altvatar/AltvatarPreview';
import { Button } from '@/app/ui/components/button';
import { FieldError, TextField } from '@/app/ui/components/field';
import '@/app/ui/styles/altvatar.css';
import '@/app/ui/styles/onboarding.css';
import { accentVars } from '@/lib/accent';
import type { AltvatarValue } from '@/lib/altvatar/types';
import { completeOnboarding } from '@/lib/data/onboarding.actions';
import type { ActionResponse } from '@/lib/types';
import { useActionState, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { LuArrowLeft, LuArrowRight, LuCheck } from 'react-icons/lu';
import {
  EverywhereBeat,
  IntroBeat,
  ProfilesBeat,
  SAMPLE_IDENTITIES,
  type Persona,
} from './StoryBeats';

const initialState: ActionResponse = { success: false, message: '' };

// One story for both populations; only the wording differs. The signup arm is
// finishing an account; the existing arm is being shown a new feature and
// asked to confirm a name it already has, so its copy must not describe
// creating an account.
const COPY = {
  signup: {
    title: 'Finish setting up your Altvatar',
    eyebrow: 'Welcome to Ctrl+List',
    // Evergreen, not launch copy: this arm greets every future signup, long
    // after Altvatars stop being news.
    introTitle: 'Meet Altvatars',
    introLede:
      'Ctrl+List runs on Altvatars. Your alter ego, each with its own look, lists, and items, with more planned. They can be co-owned or managed. The next two pages show how it works, and setting yours up is the last step of signing up.',
    profilesLede:
      "Altvatars don't stop at what you set up today. From the Altvatars page you can create as many as you like: one for the pets, the kids, a special event, anything you can think of! And best of all, an Altvatar can be managed together with someone else: one set of lists and items, kept by both of you.",
    submit: 'Save and jump in',
  },
  existing: {
    title: 'Pick your Altvatar',
    eyebrow: 'New in Ctrl+List',
    introTitle: 'Introducing',
    introLede:
      "Ctrl+List now has Altvatars. Your alter ego, each with its own look, lists, and items, with more planned. They can be co-owned or managed. The next two pages show how it works, and you'll set yours up at the end.",
    profilesLede:
      "Altvatars don't stop at what you set up today. From the new Altvatars page you can create as many as you like: one for the pets, the kids, a special event, anything you can think of! And best of all, an Altvatar can be managed together with someone else: one set of lists and items, kept by both of you.",
    submit: 'Save and jump in',
  },
} as const;

const EVERYWHERE_LEDE =
  'Sharing a list, claiming a gift, following a friend: the look goes wherever the Altvatar does.';
const FINAL_LEDE =
  "You can change your look or name any time. Save, and you're in.";

export default function OnboardingGate({
  arm,
  initialName,
  suggested,
  suggestedAccent,
  samples,
}: {
  arm: 'signup' | 'existing';
  initialName: string | null;
  /** Rolled by the layout: a roll taken here would differ between the
      server's render and the browser's. */
  suggested: AltvatarValue;
  suggestedAccent: string;
  /** Also rolled by the layout — one rolled look per sample identity in the story's
      vignettes. */
  samples: AltvatarValue[];
}) {
  const copy = COPY[arm];
  const [beat, setBeat] = useState(1);
  const [name, setName] = useState(initialName ?? '');
  const [altvatar, setAltvatar] = useState<AltvatarDraft>({
    ...suggested,
    accent: suggestedAccent,
  });
  const [chosen, setChosen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const ctaRef = useRef<HTMLButtonElement>(null);

  // Focus lands on the beat's primary control, on mount and on every beat
  // change: the gate replaces the page that was requested, so the caret
  // starting outside it would leave a keyboard user tabbing through nothing.
  // Never the name field — it is usually already right, and focusing it on a
  // phone raises the keyboard over the control that actually matters.
  useEffect(() => ctaRef.current?.focus(), [beat]);

  const [state, formAction, isPending] = useActionState<
    ActionResponse,
    FormData
  >(async () => {
    const result = await completeOnboarding({
      name,
      accent: altvatar.accent,
      altvatar: { style: altvatar.style, options: altvatar.options },
    });
    // No redirect and no reload: the gate is not a route, so the request's own
    // URL is still the page that was asked for and the next render reveals it.
    if (!result.success) toast.error(result.message);
    return result;
  }, initialState);

  const me: Persona = {
    name: name.trim() || 'You',
    accent: altvatar.accent,
    look: { style: altvatar.style, options: altvatar.options },
  };
  const persona = (i: number): Persona => ({
    ...SAMPLE_IDENTITIES[i],
    look: SAMPLE_IDENTITIES[i].look ?? samples[i],
  });

  return (
    // The backdrop carries no role and no name on purpose — it is scenery, not
    // an affordance. `data-testid` is how both harnesses reach it to prove that
    // clicking it does nothing.
    <div className="onboarding-gate-page" data-testid="onboarding-backdrop">
      <div
        className="onboarding-story"
        role="dialog"
        aria-label={copy.title}
        // Neutral until a look is confirmed: the accent flooding the glow and
        // the vignettes is the reward for picking, so the suggestion must not
        // leak in early.
        style={accentVars(chosen ? altvatar.accent : 'iris')}
      >
        <div className="onboarding-story-glow" aria-hidden />
        <form action={formAction}>
          {/* Keyed on the beat so the scroller itself remounts: iOS Safari
              keeps stale rasterized tiles of the previous beat (the poster's
              edges linger as ghosts) when only the content inside it swaps.
              Remounting also resets any scroll a taller beat left behind. */}
          <div className="onboarding-story-scroll" key={beat}>
            <div className="onboarding-story-stage">
              {beat === 1 && (
                <IntroBeat
                  eyebrow={copy.eyebrow}
                  title={copy.introTitle}
                  lede={copy.introLede}
                />
              )}
              {beat === 2 && (
                <EverywhereBeat
                  owners={
                    chosen ? [me, me, me] : [persona(0), persona(1), persona(2)]
                  }
                  lede={EVERYWHERE_LEDE}
                />
              )}
              {beat === 3 && (
                <ProfilesBeat
                  profiles={[
                    {
                      persona: chosen
                        ? me
                        : { name: me.name, accent: 'iris', look: null },
                      sub: 'You',
                    },
                    { persona: persona(3), sub: 'Managed by you' },
                    { persona: persona(4), sub: 'Shared space' },
                  ]}
                  lede={copy.profilesLede}
                />
              )}
              {beat === 4 && (
                <>
                  <h2 className="onboarding-story-beat-title os-rise">
                    You&rsquo;re all set
                  </h2>
                  <div className="onboarding-story-hero os-pop">
                    <AltvatarPreview
                      styleId={altvatar.style}
                      options={altvatar.options}
                      accent={altvatar.accent}
                    />
                    <Button
                      variant="on-dark"
                      onClick={() => setCustomizing(true)}
                    >
                      Change your look
                    </Button>
                  </div>
                  <div className="onboarding-story-name">
                    {state.message && !state.success && (
                      <FieldError>{state.message}</FieldError>
                    )}
                    <TextField
                      label="Name"
                      required
                      name="name"
                      placeholder="Display name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isPending}
                      maxLength={60}
                      error={state.errors?.name?.join(', ')}
                    />
                  </div>
                  <p className="onboarding-story-lede">{FINAL_LEDE}</p>
                </>
              )}
            </div>
          </div>
          <div className="onboarding-story-nav">
            <div className="onboarding-story-nav-row">
              <span className="onboarding-story-nav-slot">
                {beat > 1 && (
                  <Button
                    variant="on-dark"
                    icon
                    aria-label="Back"
                    onClick={() => setBeat(beat - 1)}
                  >
                    <LuArrowLeft aria-hidden />
                  </Button>
                )}
              </span>
              {beat < 3 && (
                <Button
                  variant="white"
                  className="onboarding-story-cta"
                  ref={ctaRef}
                  onClick={() => setBeat(beat + 1)}
                >
                  Next <LuArrowRight aria-hidden />
                </Button>
              )}
              {beat === 3 && (
                <Button
                  variant="white"
                  className="onboarding-story-cta"
                  ref={ctaRef}
                  onClick={() => setCustomizing(true)}
                >
                  Choose your look <LuArrowRight aria-hidden />
                </Button>
              )}
              {/* Named rather than a bare "Continue": the look is the thing
                  being confirmed, and a generic label invites a click that
                  settles it without the viewer noticing they chose. */}
              {beat === 4 && (
                <Button
                  type="submit"
                  variant="white"
                  className="onboarding-story-cta"
                  ref={ctaRef}
                  isLoading={isPending}
                >
                  {copy.submit} <LuCheck aria-hidden />
                </Button>
              )}
              <span className="onboarding-story-nav-slot" />
            </div>
            <div className="onboarding-story-dots" aria-hidden>
              {[1, 2, 3, 4].map((n) => (
                <span key={n} data-active={n === beat || undefined} />
              ))}
            </div>
          </div>
        </form>
      </div>

      {customizing && (
        <AltvatarCustomizer
          value={altvatar}
          onConfirm={(draft) => {
            setAltvatar(draft);
            setChosen(true);
            setCustomizing(false);
            // Confirming a look is what earns the final beat: it opens on the
            // confirmation screen, never on an unchosen one.
            setBeat(4);
          }}
          onCancel={() => setCustomizing(false)}
        />
      )}
    </div>
  );
}
