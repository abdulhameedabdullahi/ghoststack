import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./components/Button";
import { StockCardView } from "./components/cards/StockCardView";
import { SalesLogCardView } from "./components/cards/SalesLogCardView";
import { DailySummaryCardView } from "./components/cards/DailySummaryCardView";
import { TabBar } from "./components/TabBar";
import { ModeSwitch, type Mode } from "./components/ModeSwitch";
import { BuilderPanel } from "./components/builder/BuilderPanel";
import { DebtsPanel } from "./components/cards/DebtsPanel";
import { visibleCards } from "./domain";
import type {
  DebtsCard,
  SalesLogCard,
  Stack,
  StockCard,
} from "./domain/types";
import { todayRange, type DayRange } from "./domain-ui/dayRange";
import { addItem } from "./domain/items";
import { SAMPLE_ITEMS_BY_STARTER } from "./domain-ui/sampleItems";
import {
  StarterChooser,
  type StarterKind,
} from "./components/builder/StarterChooser";
import { StackPicker } from "./components/StackPicker";
import { buildFarmStallStack, buildStarterStack } from "./stacks/starterStack";
import {
  STORAGE_ERROR_MESSAGES,
  listStacks,
  loadStack,
  saveStack,
} from "./storage/stackStore";
import { readLastOpenedId, rememberLastOpenedId } from "./storage/lastOpened";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "choosing" }
  | { kind: "ready" };

export default function App() {
  const [stack, setStack] = useState<Stack | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const loadStartedRef = useRef(false);
  // Kept current so the save queue can always read the newest Stack.
  const latestStackRef = useRef<Stack | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedStacks, setSavedStacks] = useState<
    { id: string; name: string }[]
  >([]);
  const [savesInFlight, setSavesInFlight] = useState(0);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [midnight, setMidnight] = useState(
    () => document.documentElement.dataset.theme === "midnight",
  );

  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(
    undefined,
  );
  const [mode, setMode] = useState<Mode>("play");
  const [starterChooserOpen, setStarterChooserOpen] = useState(false);
  const [dayRange, setDayRange] = useState<DayRange>(() => todayRange());

  const visible = stack ? visibleCards(stack) : [];
  const selectedCard = visible.find((c) => c.id === selectedCardId) ?? visible[0];
  const tabs = visible.map((c) => ({ id: c.id, label: c.title }));

  const selectTab = (id: string) => {
    const chosen = stack?.cards.find((c) => c.id === id);
    if (chosen?.type === "daily-summary") setDayRange(todayRange());
    setSelectedCardId(id);
  };

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") setDayRange(todayRange());
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    // Run the load once, even under StrictMode's double effect run.
    // No cleanup cancel: the flag prevents a second run, and cancelling
    // would drop the first run's result.
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;

    void (async () => {
      let stacks: { id: string; name: string }[];
      try {
        stacks = await listStacks();
      } catch {
        stacks = [];
      }
      if (stacks.length === 0) {
        setLoadState({ kind: "choosing" });
        return;
      }
      setSavedStacks(stacks);
      const lastId = readLastOpenedId();
      const candidates: string[] = [];
      if (lastId && stacks.some((s) => s.id === lastId)) candidates.push(lastId);
      if (!candidates.includes(stacks[0].id)) candidates.push(stacks[0].id);
      let loaded: Stack | null = null;
      let failure = "";
      for (const id of candidates) {
        const result = await loadStack(id);
        if (result.ok) {
          loaded = result.value;
          break;
        }
        failure = result.error.message;
      }
      if (!loaded) {
        setLoadState({ kind: "error", message: failure });
        return;
      }
      rememberLastOpenedId(loaded.id);
      latestStackRef.current = loaded;
      setStack(loaded);
      setSelectedCardId(visibleCards(loaded)[0]?.id);
      setLoadState({ kind: "ready" });
    })();
  }, []);

  const refreshSavedStacks = useCallback(async () => {
    try {
      setSavedStacks(await listStacks());
    } catch {
      // Keep the old list if it cannot be read.
    }
  }, []);

  const enqueueSave = useCallback(() => {
    setSavesInFlight((n) => n + 1);
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      try {
        const latest = latestStackRef.current;
        if (!latest) return;
        let result;
        try {
          result = await saveStack(latest);
        } catch {
          result = null;
        }
        if (result && result.ok) {
          setSaveError(null);
          await refreshSavedStacks();
        } else
          setSaveError(
            result && !result.ok
              ? result.error.message
              : STORAGE_ERROR_MESSAGES.SAVE_FAILED,
          );
      } finally {
        setSavesInFlight((n) => n - 1);
      }
    });
  }, [refreshSavedStacks]);

  const openStack = useCallback(
    async (id: string) => {
      await saveQueueRef.current;
      let result;
      try {
        result = await loadStack(id);
      } catch {
        setSwitchError(STORAGE_ERROR_MESSAGES.UNREADABLE_DATA);
        return;
      }
      if (!result.ok) {
        setSwitchError(result.error.message);
        return;
      }
      const loaded = result.value;
      setSwitchError(null);
      rememberLastOpenedId(loaded.id);
      latestStackRef.current = loaded;
      setStack(loaded);
      setSelectedCardId(visibleCards(loaded)[0]?.id);
      setMode("play");
      setStarterChooserOpen(false);
      await refreshSavedStacks();
    },
    [refreshSavedStacks],
  );

  const onStackChange = useCallback(
    (newStack: Stack) => {
      latestStackRef.current = newStack;
      setStack(newStack);
      enqueueSave();
    },
    [enqueueSave],
  );

  const onPick = useCallback(
    async (
      kind: StarterKind,
      withSamples: boolean,
    ): Promise<{ ok: true } | { ok: false; message: string }> => {
      try {
        await saveQueueRef.current;
        const ids = {
          stackId: crypto.randomUUID(),
          stockCardId: crypto.randomUUID(),
          salesCardId: crypto.randomUUID(),
          debtsCardId: crypto.randomUUID(),
          summaryCardId: crypto.randomUUID(),
        };
        let built =
          kind === "farm-stall"
            ? buildFarmStallStack(ids)
            : buildStarterStack(ids);
        if (withSamples) {
          for (const sample of SAMPLE_ITEMS_BY_STARTER[kind]) {
            const added = addItem({
              stack: built,
              stockCardId: ids.stockCardId,
              itemId: crypto.randomUUID(),
              ...sample,
            });
            if (!added.ok) return { ok: false, message: added.error.message };
            built = added.value;
          }
        }
        const saved = await saveStack(built);
        if (!saved.ok) return { ok: false, message: saved.error.message };
        rememberLastOpenedId(built.id);
        latestStackRef.current = built;
        setStack(built);
        setSwitchError(null);
        void refreshSavedStacks();
        setSelectedCardId(visibleCards(built)[0]?.id);
        setMode("play");
        setStarterChooserOpen(false);
        setLoadState({ kind: "ready" });
        return { ok: true };
      } catch {
        return { ok: false, message: STORAGE_ERROR_MESSAGES.SAVE_FAILED };
      }
    },
    [refreshSavedStacks],
  );

  const toggleTheme = () => {
    const next = midnight ? "light" : "midnight";
    document.documentElement.dataset.theme = next;
    setMidnight(next === "midnight");
    try {
      localStorage.setItem("ghoststack:theme", next);
    } catch {
      // Theme still changes for this session.
    }
  };

  const stockCard = stack?.cards.find(
    (c): c is StockCard => c.type === "stock",
  );

  const salesCard = stack?.cards.find(
    (c): c is SalesLogCard => c.type === "sales-log",
  );
  const debtsCard = stack?.cards.find(
    (c): c is DebtsCard => c.type === "debts",
  );

  return (
    <main>
      <Button onClick={toggleTheme}>
        {midnight ? "Midnight mode: on" : "Midnight mode: off"}
      </Button>
      {saveError && (
        <div role="alert">
          <p>{saveError}</p>
          <Button onClick={enqueueSave}>Try again</Button>
        </div>
      )}
      {switchError && <p role="alert">{switchError}</p>}
      {loadState.kind === "ready" && stack && !starterChooserOpen && (
        <StackPicker
          stacks={savedStacks}
          currentStackId={stack.id}
          onPick={(id) => void openStack(id)}
          disabled={savesInFlight > 0}
        />
      )}
      {loadState.kind === "loading" && <p>Opening your shop…</p>}
      {loadState.kind === "error" && <p role="alert">{loadState.message}</p>}
      {loadState.kind === "choosing" && <StarterChooser onPick={onPick} />}
      {loadState.kind === "ready" && starterChooserOpen && (
        <StarterChooser
          onPick={onPick}
          onCancel={() => setStarterChooserOpen(false)}
        />
      )}
      {loadState.kind === "ready" &&
        !starterChooserOpen &&
        stack &&
        stockCard &&
        selectedCard && (
          <>
            <ModeSwitch mode={mode} onChange={setMode} />
            {mode === "builder" ? (
              <BuilderPanel
                stack={stack}
                onStackChange={onStackChange}
                onOpenStarterChooser={() => setStarterChooserOpen(true)}
              />
            ) : (
              <>
                <TabBar
                  tabs={tabs}
                  selectedId={selectedCard.id}
                  onSelect={selectTab}
                />
                <div
                  role="tabpanel"
                  id={`panel-${selectedCard.id}`}
                  aria-labelledby={`tab-${selectedCard.id}`}
                >
                  {selectedCard.type === "stock" && (
                    <StockCardView
                      stack={stack}
                      card={stockCard}
                      onStackChange={onStackChange}
                      salesCardId={salesCard?.id}
                    />
                  )}
                  {selectedCard.type === "sales-log" && salesCard && (
                    <SalesLogCardView stack={stack} card={salesCard} />
                  )}
                  {selectedCard.type === "debts" && (
                    <DebtsPanel
                      stack={stack}
                      card={debtsCard}
                      onStackChange={onStackChange}
                    />
                  )}
                  {selectedCard.type === "daily-summary" && (
                    <DailySummaryCardView stack={stack} dayRange={dayRange} />
                  )}
                </div>
              </>
            )}
          </>
        )}
    </main>
  );
}
