import { useEffect } from "react";

import { useGhost } from "./GhostProvider";

/** Reacts with "errorShown" whenever a new non-empty error message appears. */
export function useGhostError(message: string | null | undefined): void {
  const { react } = useGhost();
  useEffect(() => {
    if (typeof message === "string" && message !== "") {
      react("errorShown");
    }
  }, [message, react]);
}
