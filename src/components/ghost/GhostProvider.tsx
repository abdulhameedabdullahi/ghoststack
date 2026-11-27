import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { MOODS } from "./ghostFrames";
import { initialState, next } from "./ghostMachine";
import { isTipKind, pickTip } from "./ghostTips";
import type { GhostEvent, GhostMood, GhostState } from "./ghostTypes";

export interface GhostProviderProps {
  initialMidnight?: boolean;
  idleMs?: number;
  bubbleMs?: number;
  moodMs?: Partial<Record<GhostMood, number>>;
  children: ReactNode;
}

export interface GhostApi {
  state: GhostState;
  /** Changes on every react(); used as the Mascot's key. */
  stamp: number;
  bubble: string | null;
  react: (event: GhostEvent | GhostEvent["type"]) => void;
  dismissBubble: () => void;
  /** True only when a GhostProvider is above. */
  active: boolean;
}

const noop = (): void => { };

const NO_PROVIDER: GhostApi = {
  state: initialState(false),
  stamp: 0,
  bubble: null,
  react: noop,
  dismissBubble: noop,
  active: false,
};

/** Exported so tests can supply a spy value. */
export const GhostContext = createContext<GhostApi>(NO_PROVIDER);

export function useGhost(): GhostApi {
  return useContext(GhostContext);
}

export function GhostProvider({
  initialMidnight = false,
  idleMs = 60000,
  bubbleMs = 12000,
  moodMs,
  children,
}: GhostProviderProps) {
  const [state, dispatch] = useReducer(next, initialMidnight, initialState);
  const [stamp, setStamp] = useState(0);
  const [bubble, setBubble] = useState<string | null>(null);

  const tipCounter = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moodRef = useRef<GhostMood>(state.mood);
  const openedRef = useRef(false);
  const idleMsRef = useRef(idleMs);
  const moodMsRef = useRef(moodMs);

  useEffect(() => {
    moodRef.current = state.mood;
    idleMsRef.current = idleMs;
    moodMsRef.current = moodMs;
  });

  const restartIdle = useCallback(() => {
    if (idleTimer.current !== null) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      idleTimer.current = null;
      dispatch({ type: "idleTimeout" });
    }, idleMsRef.current);
  }, []);

  const react = useCallback(
    (event: GhostEvent | GhostEvent["type"]) => {
      const e: GhostEvent =
        typeof event !== "string"
          ? event
          : event === "midnightToggled"
            ? { type: event, on: false }
            : { type: event };
      dispatch(e);
      setStamp((s) => s + 1);
      if (isTipKind(e.type)) {
        setBubble(pickTip(e.type, tipCounter.current++));
      }
      restartIdle();
    },
    [restartIdle],
  );

  const dismissBubble = useCallback(() => setBubble(null), []);

  // Mood timer: a Busy_Mood ends itself, also under reduced motion.
  useEffect(() => {
    const ms = moodMs?.[state.mood] ?? MOODS[state.mood].ms;
    if (ms <= 0) return undefined;
    const id = setTimeout(() => dispatch({ type: "animationDone" }), ms);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mood, stamp]);

  // Idle timer and interaction listeners.
  useEffect(() => {
    const touch = () => {
      if (moodRef.current === "sleep") dispatch({ type: "animationDone" });
      restartIdle();
    };
    document.addEventListener("pointerdown", touch);
    document.addEventListener("keydown", touch);
    restartIdle();
    return () => {
      document.removeEventListener("pointerdown", touch);
      document.removeEventListener("keydown", touch);
      if (idleTimer.current !== null) {
        clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }
    };
  }, [restartIdle]);

  // Bubble timer.
  useEffect(() => {
    if (bubble === null) return undefined;
    const id = setTimeout(() => setBubble(null), bubbleMs);
    return () => clearTimeout(id);
  }, [bubble, bubbleMs]);

  // Sleeping ghosts have no bubble.
  useEffect(() => {
    if (state.mood === "sleep") setBubble(null);
  }, [state.mood]);

  // appOpened once; the ref survives the StrictMode double run.
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    react("appOpened");
  }, [react]);

  const value = useMemo<GhostApi>(
    () => ({ state, stamp, bubble, react, dismissBubble, active: true }),
    [state, stamp, bubble, react, dismissBubble],
  );

  return <GhostContext.Provider value={value}>{children}</GhostContext.Provider>;
}
