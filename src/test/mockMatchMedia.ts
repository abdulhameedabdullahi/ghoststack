// Test-only helper. Replaces window.matchMedia with a small fake so tests can
// control a media query. It is not imported by app code.

export interface MatchMediaController {
  /** Set the current answer and tell every listener. */
  setMatches(value: boolean): void;
  /** Put the original window.matchMedia back. */
  restore(): void;
}

type Listener = (event: MediaQueryListEvent) => void;

function restoreFn(original: unknown, had: boolean): () => void {
  return () => {
    if (had) {
      Object.defineProperty(window, "matchMedia", {
        value: original,
        configurable: true,
        writable: true,
      });
    } else {
      delete (window as unknown as Record<string, unknown>).matchMedia;
    }
  };
}

export function installMatchMedia(initial: boolean): MatchMediaController {
  const had = "matchMedia" in window;
  const original = (window as unknown as Record<string, unknown>).matchMedia;
  let matches = initial;
  const listeners = new Set<Listener>();

  const makeList = (query: string): MediaQueryList => {
    const list = {
      get matches() {
        return matches;
      },
      media: query,
      onchange: null,
      addEventListener: (type: string, listener: Listener) => {
        if (type === "change") listeners.add(listener);
      },
      removeEventListener: (type: string, listener: Listener) => {
        if (type === "change") listeners.delete(listener);
      },
      addListener: (listener: Listener) => {
        listeners.add(listener);
      },
      removeListener: (listener: Listener) => {
        listeners.delete(listener);
      },
      dispatchEvent: () => true,
    };
    return list as unknown as MediaQueryList;
  };

  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => makeList(query),
    configurable: true,
    writable: true,
  });

  return {
    setMatches(value: boolean) {
      matches = value;
      const event = { matches: value } as MediaQueryListEvent;
      for (const listener of Array.from(listeners)) listener(event);
    },
    restore: restoreFn(original, had),
  };
}

/** Deletes window.matchMedia. Returns a function that puts it back. */
export function removeMatchMedia(): () => void {
  const had = "matchMedia" in window;
  const original = (window as unknown as Record<string, unknown>).matchMedia;
  delete (window as unknown as Record<string, unknown>).matchMedia;
  return restoreFn(original, had);
}
