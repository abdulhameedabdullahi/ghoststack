export interface ServiceWorkerCallbacks {
  onOfflineReady: () => void;
  onNeedRefresh: () => void;
}

export interface ServiceWorkerHandle {
  applyUpdate: () => Promise<void>;
}

type UpdateSW = (reloadPage?: boolean) => Promise<void>;

/**
 * Registers the service worker in production builds only.
 * Returns null when registration is not possible. Never throws.
 * A waiting worker is activated only when applyUpdate is called
 * (the owner pressed "Reload").
 */
export function registerServiceWorker(
  cb: ServiceWorkerCallbacks,
): ServiceWorkerHandle | null {
  if (!import.meta.env.PROD) return null;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  let updateSW: UpdateSW | null = null;

  const safe = (fn: () => void) => () => {
    try {
      fn();
    } catch {
      // A broken notice must never break the app.
    }
  };

  void (async () => {
    try {
      const { registerSW } = await import('virtual:pwa-register');
      updateSW = registerSW({
        immediate: true,
        onOfflineReady: safe(cb.onOfflineReady),
        onNeedRefresh: safe(cb.onNeedRefresh),
        onRegisterError: () => {
          // Swallow: the app works without the service worker.
        },
      });
    } catch {
      // Swallow import or registration errors.
    }
  })();

  return {
    applyUpdate: async () => {
      try {
        await updateSW?.(true);
      } catch {
        // Swallow: the old version keeps working.
      }
    },
  };
}
