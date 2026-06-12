/* eslint-disable testing-library/no-node-access --
 * ServiceWorkerRegistration always renders null; it exists only for its mount
 * side effect. There is no queryable element, so `container.firstChild` is the
 * only way to assert the no-DOM contract.
 */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceWorkerRegistration } from '../ServiceWorkerRegistration';

function stubServiceWorker(register: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register },
  });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker');
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

    it('Rerendered_RegistersOnlyOnce', () => {
      const register = vi.fn().mockResolvedValue(undefined);
      stubServiceWorker(register);

      const { rerender } = render(<ServiceWorkerRegistration />);
      rerender(<ServiceWorkerRegistration />);

      expect(register).toHaveBeenCalledTimes(1);
    });
  });
});
