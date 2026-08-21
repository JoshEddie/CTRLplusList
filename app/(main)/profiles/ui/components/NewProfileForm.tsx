'use client';

import { FieldError } from '@/app/ui/components/field';
import { FormShell, FormShellFooter } from '@/app/ui/components/FormShell';
import { randomAccentName } from '@/lib/accent';
import { createProfile } from '@/lib/data/profile.actions';
import type { ActionResponse } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';
import toast from 'react-hot-toast';
import AccentPreview from './AccentPreview';
import ProfileFields from './ProfileFields';

const initialState: ActionResponse = { success: false, message: '' };

export default function NewProfileForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  // Mounted only on the creator's click, so this never server-renders and the
  // roll cannot mismatch on hydration.
  const [accent, setAccent] = useState<string>(randomAccentName);

  const [state, formAction, isPending] = useActionState<
    ActionResponse,
    FormData
  >(async () => {
    const result = await createProfile({
      name,
      tagline,
      accent,
    });

    if (result.success) {
      // No success toast: the navigation is the confirmation, and a toast
      // raised into it would be discarded.
      onClose();
      router.push(`/profiles/${result.id}`);
    } else {
      toast.error(result.message);
    }
    return result;
  }, initialState);

  return (
    <FormShell title="New Profile" onClose={onClose}>
      <form action={formAction}>
        <div className="form-shell-body">
          <p className="new-profile-explainer">
            A managed profile is a list-keeper without its own sign-in — a
            child, a couple, a household. You run its lists; friends and family
            follow it like anyone else.
          </p>
          {state.message && !state.success && (
            <FieldError>{state.message}</FieldError>
          )}
          <ProfileFields
            name={name}
            onNameChange={setName}
            tagline={tagline}
            onTaglineChange={setTagline}
            accent={accent}
            onAccentChange={setAccent}
            disabled={isPending}
            errors={state.errors}
            preview={
              <AccentPreview name={name} tagline={tagline} accent={accent} />
            }
          />
        </div>

        <FormShellFooter
          onCancel={onClose}
          submitLabel="Create Profile"
          isPending={isPending}
        />
      </form>
    </FormShell>
  );
}
