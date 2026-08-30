'use client';

import { FormShell, FormShellFooter } from '@/app/ui/components/FormShell';
import { Button } from '@/app/ui/components/button';
import { SelectField } from '@/app/ui/components/field';
import {
  mintInvite,
  type MemberRole,
} from '@/lib/data/profile.members.actions';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { MdPersonAdd } from 'react-icons/md';

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'owner', label: 'Owner' },
];

// Admission is the link and nothing else, so there is no candidate pool and no
// empty state — there is nobody to list. The minted link is not shown here: it
// lands in the Permissions roster as a pending row, which is where copying,
// re-roling and revoking it live for as long as it is outstanding.
export default function InviteFlow({
  profileId,
  profileName,
  viewerIsOwner,
}: {
  profileId: string;
  profileName: string;
  viewerIsOwner: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<MemberRole>('manager');
  const [isPending, startTransition] = useTransition();

  const close = () => {
    setOpen(false);
    setRole('manager');
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await mintInvite(profileId, role);
      if (result.success) {
        toast.success('Invite link added to Permissions');
        close();
        router.refresh();
      } else toast.error(result.message);
    });
  };

  return (
    <>
      <Button
        variant="primary"
        aria-label="Invite someone"
        aria-disabled={!viewerIsOwner || undefined}
        onClick={() => {
          if (!viewerIsOwner) return;
          setOpen(true);
        }}
      >
        <MdPersonAdd size={16} />
        <span className="mobile-hide">Invite someone</span>
      </Button>

      {open && (
        <FormShell title="Invite someone" onClose={close}>
          <form onSubmit={submit}>
            <div className="form-shell-body">
              <p>
                A link that admits one person to {profileName}, once, within
                seven days. It appears under Permissions for you to copy and
                send.
              </p>
              <SelectField
                label="Role"
                description={`What this link grants on ${profileName}.`}
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
                options={ROLE_OPTIONS}
              />
            </div>
            <FormShellFooter
              onCancel={close}
              submitLabel="Create link"
              isPending={isPending}
            />
          </form>
        </FormShell>
      )}
    </>
  );
}
