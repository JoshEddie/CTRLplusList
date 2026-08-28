'use client';

import type { AltvatarDraft } from '@/app/ui/components/altvatar/AltvatarCustomizer';
import AltvatarField from '@/app/ui/components/altvatar/AltvatarField';
import AltvatarMark from '@/app/ui/components/altvatar/AltvatarMark';
import { Button } from '@/app/ui/components/button';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { FieldError, TextField } from '@/app/ui/components/field';
import '@/app/ui/styles/altvatar.css';
import '@/app/ui/styles/onboarding.css';
import { accentVars } from '@/lib/accent';
import type { AltvatarValue } from '@/lib/altvatar/types';
import { completeOnboarding } from '@/lib/data/onboarding.actions';
import { abandonAccount } from '@/lib/data/user.actions';
import type { ActionResponse } from '@/lib/types';
import { useActionState, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const initialState: ActionResponse = { success: false, message: '' };

// One layout for both populations; only the wording differs. The signup arm is
// finishing an account it can still abandon; the existing arm is being shown a
// new feature and asked to confirm a name it already has, so its copy must not
// describe creating an account.
const COPY = {
  signup: {
    title: 'Finish setting up your profile',
    lede: 'Your profile is the name, face and colour your lists appear under. Pick them to finish signing up — everything else can wait, and you can change any of it later.',
    fieldHelp:
      'Your face and accent colour. Shown wherever your profile appears — on your lists, beside your name, and to anyone you share with.',
    submit: 'Create my profile',
    cancelPrompt: 'Cancel sign-up?',
    cancelMessage:
      'This deletes the account you just created. Nothing is kept, and signing in again starts over.',
  },
  existing: {
    title: 'Pick your Altvatar',
    lede: 'Profiles have faces now, and everyone picks one once. Your lists, items and claims are exactly where you left them — choose a face and a colour to carry on. It takes a few seconds, you will not be asked again, and you can change both any time from your profile.',
    fieldHelp:
      'Your face and accent colour. Shown wherever your profile appears — on your lists, beside your name, and to anyone you share with.',
    submit: 'Save and continue',
  },
} as const;

export default function OnboardingGate({
  arm,
  initialName,
  suggested,
  suggestedAccent,
}: {
  arm: 'signup' | 'existing';
  initialName: string | null;
  /** Rolled by the layout: a roll taken here would differ between the
      server's render and the browser's. */
  suggested: AltvatarValue;
  suggestedAccent: string;
}) {
  const copy = COPY[arm];
  const [name, setName] = useState(initialName ?? '');
  const [altvatar, setAltvatar] = useState<AltvatarDraft>({
    ...suggested,
    accent: suggestedAccent,
  });
  const [confirming, setConfirming] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Focus moves into the gate when it renders: it replaces the page that was
  // requested, so the caret starting outside it would leave a keyboard user
  // tabbing through nothing.
  useEffect(() => nameRef.current?.focus(), []);

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

  const cancel = () => {
    if (arm === 'signup') setConfirming(true);
    // The existing arm signs out and deletes nothing; the profile row and
    // everything hanging off it survive.
    else void abandonAccount();
  };

  return (
    // The backdrop carries no role and no name on purpose — it is scenery, not
    // an affordance. `data-testid` is how both harnesses reach it to prove that
    // clicking it does nothing.
    <div className="onboarding-gate-page" data-testid="onboarding-backdrop">
      {/* Its own shell rather than `FormShell`: the header is an accent
          gradient carrying the mark, and there is no close affordance to
          suppress — the gate has none by construction. */}
      <div
        className="onboarding-gate"
        role="dialog"
        aria-label={copy.title}
        style={accentVars(altvatar.accent)}
      >
        <div className="altvatar-hd">
          <AltvatarMark />
        </div>
        <form action={formAction}>
          <div className="onboarding-gate-body">
            <h1 className="onboarding-gate-title">{copy.title}</h1>
            <p className="onboarding-gate-lede">{copy.lede}</p>
            {state.message && !state.success && (
              <FieldError>{state.message}</FieldError>
            )}
            <TextField
              label="Name"
              required
              name="name"
              ref={nameRef}
              placeholder="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              maxLength={60}
              error={state.errors?.name?.join(', ')}
            />
            <AltvatarField
              value={altvatar}
              onChange={setAltvatar}
              name={name}
              description={copy.fieldHelp}
            />
          </div>
          <div className="altvatar-ft">
            <Button variant="secondary" type="button" onClick={cancel}>
              Cancel
            </Button>
            {/* Named rather than a bare "Continue": the face is the thing
                being confirmed, and a generic label invites a click that
                settles it without the viewer noticing they chose. */}
            <Button type="submit" variant="primary" isLoading={isPending}>
              {copy.submit}
            </Button>
          </div>
        </form>
      </div>

      {arm === 'signup' && (
        <ConfirmDialog
          isOpen={confirming}
          onClose={() => setConfirming(false)}
          onConfirm={() => void abandonAccount()}
          title={COPY.signup.cancelPrompt}
          message={COPY.signup.cancelMessage}
          confirmText="Delete account"
        />
      )}
    </div>
  );
}
