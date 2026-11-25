const LAST_OPENED_KEY = "ghoststack:lastOpenedStackId";

/** Remembers the id of the last opened stack. Best effort: failures are ignored. */
export function rememberLastOpenedId(id: string): void {
  try {
    localStorage.setItem(LAST_OPENED_KEY, id);
  } catch {
    // Last-opened tracking is best-effort; the stack stays open either way.
  }
}

/** Reads the last opened stack id, or null if none is stored or storage fails. */
export function readLastOpenedId(): string | null {
  try {
    return localStorage.getItem(LAST_OPENED_KEY);
  } catch {
    return null;
  }
}
