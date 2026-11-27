import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  SHARE_ERROR_MESSAGES,
  browserShareEnvironment,
  deliverMessage,
  type MessageText,
  type ShareEnvironment,
  type ShareResult,
} from "../../domain-ui/share";
import {
  SHARE_COPIED,
  SHARE_MANUAL,
  SHARE_OPENED,
  SHARE_SHARED,
} from "./shareMessages";

type View =
  | { kind: "none" }
  | { kind: "notice"; text: string }
  | { kind: "manual"; text: string };

type PendingFocus = undefined | "textarea" | "origin";

export interface ShareContextValue {
  /** True while a delivery is in flight. Drives aria-disabled on share buttons. */
  busy: boolean;
  /** Starts a share. Ignored while busy. `origin` gets focus back on Done. */
  share: (
    makeText: () => ShareResult<MessageText>,
    origin: HTMLElement | null,
  ) => Promise<void>;
  /** Text for the role="status" element. Empty when there is nothing to say. */
  noticeText: string;
  /** Text for the manual-copy textarea, or undefined when it is hidden. */
  manualText: string | undefined;
  /** Closes the manual box and returns focus to the button that started it. */
  done: () => void;
  /** ShareStatus attaches this to the manual textarea. */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

const ShareContext = createContext<ShareContextValue | undefined>(undefined);

export interface ShareProviderProps {
  env?: ShareEnvironment;
  resetKey?: string;
  children: ReactNode;
}

export function ShareProvider({
  env = browserShareEnvironment,
  resetKey,
  children,
}: ShareProviderProps) {
  const [view, setView] = useState<View>({ kind: "none" });
  const [busy, setBusy] = useState(false);
  const [pendingFocus, setPendingFocus] = useState<PendingFocus>(undefined);
  const busyRef = useRef(false);
  const originRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const generationRef = useRef(0);
  const envRef = useRef(env);
  envRef.current = env;

  // Leaving the tab (resetKey change) clears the view and drops any
  // delivery that is still in flight.
  useEffect(() => {
    generationRef.current += 1;
    setView({ kind: "none" });
    setPendingFocus(undefined);
  }, [resetKey]);

  // Same pattern as DebtsCardView: read the target, focus it, clear the request.
  useEffect(() => {
    if (pendingFocus === undefined) return;
    if (pendingFocus === "textarea") {
      if (!textareaRef.current) return; // wait until the box is rendered
      textareaRef.current.focus();
    } else {
      const origin = originRef.current;
      if (origin && origin.isConnected) origin.focus();
    }
    setPendingFocus(undefined);
  }, [pendingFocus, view]);

  const share = useCallback(
    async (
      makeText: () => ShareResult<MessageText>,
      origin: HTMLElement | null,
    ): Promise<void> => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      originRef.current = origin;
      const generation = generationRef.current;
      setView({ kind: "none" });
      try {
        const built = makeText();
        if (!built.ok) {
          setView({ kind: "notice", text: SHARE_ERROR_MESSAGES[built.error.code] });
          return;
        }
        const text = built.value.text;
        const outcome = await deliverMessage(text, envRef.current);
        if (generation !== generationRef.current) return;
        switch (outcome.kind) {
          case "shared":
            setView({ kind: "notice", text: SHARE_SHARED });
            break;
          case "opened":
            setView({ kind: "notice", text: SHARE_OPENED });
            break;
          case "copied":
            setView({ kind: "notice", text: SHARE_COPIED });
            break;
          case "cancelled":
            setView({ kind: "none" });
            break;
          case "manual":
            setView({ kind: "manual", text: outcome.text });
            setPendingFocus("textarea");
            break;
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [],
  );

  const done = useCallback(() => {
    setView({ kind: "none" });
    setPendingFocus("origin");
  }, []);

  const value = useMemo<ShareContextValue>(
    () => ({
      busy,
      share,
      noticeText:
        view.kind === "notice" ? view.text : view.kind === "manual" ? SHARE_MANUAL : "",
      manualText: view.kind === "manual" ? view.text : undefined,
      done,
      textareaRef,
    }),
    [busy, share, view, done],
  );

  return <ShareContext.Provider value={value}>{children}</ShareContext.Provider>;
}

export function useShare(): ShareContextValue | undefined {
  return useContext(ShareContext);
}
