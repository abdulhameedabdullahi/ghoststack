/**
 * Asks the browser to keep this app's data. Best effort: it shows nothing
 * and never throws, whether the browser agrees, refuses or has no support.
 */
export function requestPersistentStorage(): void {
  try {
    const p = navigator.storage?.persist?.();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {
    /* best effort */
  }
}
