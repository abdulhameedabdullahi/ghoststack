import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function getQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  return window.matchMedia(QUERY);
}

/** True when the browser asks for less motion, or cannot tell us. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    const mql = getQuery();
    return mql === null ? true : mql.matches;
  });

  useEffect(() => {
    const mql = getQuery();
    if (mql === null) return;

    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, []);

  return reduced;
}
