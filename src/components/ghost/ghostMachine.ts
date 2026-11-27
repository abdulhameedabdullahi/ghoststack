// Pure state machine for the ghost companion.
// No clock, no randomness, no text, no timer lengths.
import { isRestingMood } from "./ghostTypes";
import type { GhostEvent, GhostMood, GhostState } from "./ghostTypes";

export function initialState(midnight: boolean): GhostState {
  return { mood: "idle", nightcap: midnight, sleepy: false };
}

function show(state: GhostState, mood: GhostMood): GhostState {
  return { mood, nightcap: state.nightcap, sleepy: false };
}

export function next(state: GhostState, event: GhostEvent): GhostState {
  switch (event.type) {
    case "appOpened":
      return show(state, "wave");
    case "saleRecorded":
    case "debtPaid":
      return show(state, "cheer");
    case "debtAdded":
      return show(state, "think");
    case "errorShown":
      return show(state, "sorry");
    case "emptyScreen":
      return show(state, "point");
    case "poked":
      return show(state, "giggle");
    case "midnightToggled":
      return { mood: "spin", nightcap: event.on, sleepy: false };
    case "idleTimeout":
      if (isRestingMood(state.mood)) {
        return { mood: "sleep", nightcap: state.nightcap, sleepy: false };
      }
      return { mood: state.mood, nightcap: state.nightcap, sleepy: true };
    case "animationDone":
      if (state.mood === "idle" || state.mood === "sleep") {
        return show(state, "idle");
      }
      return show(state, state.sleepy ? "sleep" : "idle");
    default:
      return { ...state };
  }
}
