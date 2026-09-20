import { ProfileSwitchProvider } from '@/app/ui/components/ProfileSwitchProvider';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

// Switching reads the route it is on and can navigate, so any suite rendering
// a switching surface needs a router. The mock is registered by importing this
// module — import it immediately after the `vitest` import, so the real
// `next/navigation` never binds first.
export const routerReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace }),
}));

// The provider reads `window.location`, not `usePathname()`, so the route a
// test is standing on is set on jsdom's own history.
export function setTestPathname(next: string): void {
  window.history.replaceState({}, '', next);
}

export function renderWithProfileSwitch(ui: React.ReactNode) {
  return render(<ProfileSwitchProvider>{ui}</ProfileSwitchProvider>);
}
