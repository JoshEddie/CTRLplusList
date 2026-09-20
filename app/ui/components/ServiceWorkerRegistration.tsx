'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const sw = navigator.serviceWorker;

    // The SW claims clients on activate, so a new release takes control of
    // this page without it navigating — on iOS a standalone PWA resumes from
    // its snapshot and may never re-navigate on its own. Reloading here is
    // what pulls the running app onto the new build. The first-ever install
    // also fires this with no prior controller; that one is not a release.
    const hadController = Boolean(sw.controller);
    const reloadOntoNewRelease = () => {
      if (hadController) location.reload();
    };
    sw.addEventListener('controllerchange', reloadOntoNewRelease);

    sw.register('/sw.js', { scope: '/' }).catch(() => {});

    return () => sw.removeEventListener('controllerchange', reloadOntoNewRelease);
  }, []);

  return null;
}
