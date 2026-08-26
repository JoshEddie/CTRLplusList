'use client';

import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { switchActiveProfile } from '@/lib/data/profile.actions';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from 'react';
import toast from 'react-hot-toast';

// A profile *space* is keyed to one profile's id, so it has to follow the
// switch; a profile-*scoped* surface like `/lists` renders whichever profile
// is active and must stay where it is.
const PROFILE_SPACE = /^\/profiles\/[^/]+$/;

// Read from the document rather than through `usePathname()`: this provider
// wraps every `(main)/` route, and a layout-level client component reading
// runtime URL data blocks prerendering for all of them. Nothing here needs the
// path until a switch is actually run, by which point there is a document.
const onProfileSpace = () => PROFILE_SPACE.test(window.location.pathname);

type ProfileSwitchContextValue = {
  switchProfile: (profileId: string) => void;
  dirtyRef: RefObject<boolean>;
};

const ProfileSwitchContext = createContext<ProfileSwitchContextValue | null>(
  null
);

function useProfileSwitchContext(): ProfileSwitchContextValue {
  const ctx = useContext(ProfileSwitchContext);
  if (!ctx) {
    throw new Error(
      'useProfileSwitch must be used inside a <ProfileSwitchProvider>'
    );
  }
  return ctx;
}

// One home for switching and its confirmation. A switch changes what every
// subsequent page means while the surrounding content may change without
// otherwise saying why, so the confirmation is raised here rather than by each
// surface — the nav dropdown, the profile card's body, and that card's menu
// row all announce the switch in the same words. The copy itself comes back
// from the action, which is the only place that knows the profile's name.
//
// The unsaved-changes prompt lives here too because the form holding the
// changes and the dropdown initiating the switch are different subtrees; this
// provider is the nearest thing that wraps both.
export function ProfileSwitchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [, startSwitch] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const router = useRouter();

  const run = (profileId: string) =>
    startSwitch(async () => {
      const result = await switchActiveProfile(profileId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (onProfileSpace()) {
        router.replace(`/profiles/${profileId}`);
      }
    });

  const switchProfile = (profileId: string) => {
    if (dirtyRef.current) setPendingId(profileId);
    else run(profileId);
  };

  return (
    <ProfileSwitchContext.Provider value={{ switchProfile, dirtyRef }}>
      {children}
      {pendingId && (
        <ConfirmDialog
          isOpen
          onClose={() => setPendingId(null)}
          onConfirm={() => {
            dirtyRef.current = false;
            run(pendingId);
          }}
          title="You have unsaved changes"
          message="Keep editing, or switch anyway?"
          confirmText="Switch anyway"
          cancelText="Keep editing"
        />
      )}
    </ProfileSwitchContext.Provider>
  );
}

export function useProfileSwitch(): (profileId: string) => void {
  return useProfileSwitchContext().switchProfile;
}

/** Holds a switch behind a confirmation for as long as `isDirty`. */
export function useUnsavedChanges(isDirty: boolean): void {
  const { dirtyRef } = useProfileSwitchContext();
  useEffect(() => {
    dirtyRef.current = isDirty;
    return () => {
      dirtyRef.current = false;
    };
  }, [isDirty, dirtyRef]);
}
