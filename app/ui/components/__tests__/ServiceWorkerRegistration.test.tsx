/* eslint-disable testing-library/no-node-access --
 * ServiceWorkerRegistration always renders null; it exists only for its mount
 * side effect. There is no queryable element, so `container.firstChild` is the
 * only way to assert the no-DOM contract.
 */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceWorkerRegistration } from '../ServiceWorkerRegistration';

function stubServiceWorker(
  register: ReturnType<typeof vi.fn>,
  controller: object | null = null
) {
  const sw = Object.assign(new EventTarget(), { register, controller });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: sw,
  });
  return sw;
}

function stubReload() {
  const reload = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  });
  return reload;
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker');
  Reflect.deleteProperty(window, 'location');
  vi.restoreAllMocks();
});

describe('ServiceWorkerRegistration', () => {
  describe('RegistrationContract', () => {
    it('ApiAvailable_RegistersSwJsAtScopeRoot', () => {
      const register = vi.fn().mockResolvedValue(undefined);
      stubServiceWorker(register);

      render(<ServiceWorkerRegistration />);

      expect(register).toHaveBeenCalledTimes(1);
      expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    });

    it('ApiUnavailable_DoesNotRegister-DoesNotThrow', () => {
      const register = vi.fn();

      // No stub installed: jsdom's navigator has no `serviceWorker`, so the
      // feature-detection guard short-circuits.
      expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
      expect(register).not.toHaveBeenCalled();
    });

    it('RegisterRejects_RejectionSwallowed', async () => {
      const register = vi.fn().mockRejectedValue(new Error('registration failed'));
      stubServiceWorker(register);

      const { container } = render(<ServiceWorkerRegistration />);
      // Flush the rejected promise's microtask so the `.catch(() => {})` arm
      // runs; an unswallowed rejection would surface here as a test failure.
      await Promise.resolve();

      expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
      expect(container.firstChild).toBeNull();
    });

    it('Rendered_ProducesNoDom', () => {
      const register = vi.fn().mockResolvedValue(undefined);
      stubServiceWorker(register);

      const { container } = render(<ServiceWorkerRegistration />);

      expect(container.firstChild).toBeNull();
    });

    it('ControllerReplaced_ReloadsOntoNewRelease', () => {
      const sw = stubServiceWorker(vi.fn().mockResolvedValue(undefined), {});
      const reload = stubReload();

      render(<ServiceWorkerRegistration />);
      sw.dispatchEvent(new Event('controllerchange'));

      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('FirstInstallClaimsUncontrolledPage_DoesNotReload', () => {
      const sw = stubServiceWorker(vi.fn().mockResolvedValue(undefined));
      const reload = stubReload();

      render(<ServiceWorkerRegistration />);
      sw.dispatchEvent(new Event('controllerchange'));

      expect(reload).not.toHaveBeenCalled();
    });

    it('Unmounted_StopsReloadingOnControllerChange', () => {
      const sw = stubServiceWorker(vi.fn().mockResolvedValue(undefined), {});
      const reload = stubReload();

      const { unmount } = render(<ServiceWorkerRegistration />);
      unmount();
      sw.dispatchEvent(new Event('controllerchange'));

      expect(reload).not.toHaveBeenCalled();
    });

    it('Rerendered_RegistersOnlyOnce', () => {
      const register = vi.fn().mockResolvedValue(undefined);
      stubServiceWorker(register);

      const { rerender } = render(<ServiceWorkerRegistration />);
      rerender(<ServiceWorkerRegistration />);

      expect(register).toHaveBeenCalledTimes(1);
    });
  });
});
