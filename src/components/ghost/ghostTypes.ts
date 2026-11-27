// Shared types for the ghost companion. Pure: no React import.

export const GHOST_MOODS = [
  "idle",
  "wave",
  "cheer",
  "think",
  "spin",
  "sorry",
  "point",
  "sleep",
  "giggle",
] as const;

export type GhostMood = (typeof GHOST_MOODS)[number];

export function isGhostMood(value: unknown): value is GhostMood {
  return (
    typeof value === "string" &&
    (GHOST_MOODS as readonly string[]).includes(value)
  );
}

/** Resting moods last until an interaction; all others are Busy_Moods. */
export function isRestingMood(mood: GhostMood): boolean {
  return mood === "idle" || mood === "sleep";
}

export type GhostEvent =
  | { type: "midnightToggled"; on: boolean }
  | {
      type:
        | "appOpened"
        | "saleRecorded"
        | "debtAdded"
        | "debtPaid"
        | "errorShown"
        | "emptyScreen"
        | "idleTimeout"
        | "poked"
        | "animationDone";
    };

export interface GhostState {
  readonly mood: GhostMood;
  readonly nightcap: boolean; // true only in Midnight mode
  readonly sleepy: boolean; // true only while a Busy_Mood plays and idleTimeout has come
}
