import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./components/Button";
import { StockCardView } from "./components/cards/StockCardView";
import { SalesLogCardView } from "./components/cards/SalesLogCardView";
import { DailySummaryCardView } from "./components/cards/DailySummaryCardView";
import { TabBar } from "./components/TabBar";
import { DebtsPanel } from "./components/cards/DebtsPanel";
import type {
  CardType,
  DebtsCard,
  SalesLogCard,
  Stack,
  StockCard,
} from "./domain/types";
import { todayRange, type DayRange } from "./domain-ui/dayRange";
import { buildStarterStack } from "./stacks/starterStack";
import {
  STORAGE_ERROR_MESSAGES,
  listStacks,
  loadStack,
  saveStack,
} from "./storage/stackStore";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

export default function App() {
  const [stack, setStack] = useState<Stack | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const loadStartedRef = useRef(false);
  // Kept current so the save queue can always read the newest Stack.
  const latestStackRef = useRef<Stack | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [midnight, setMidnight] = useState(
    () => document.documentElement.dataset.theme === "midnight",
  );

  const [selectedTab, setSelectedTab] = useState<CardType>("stock");
  const [dayRange, setDayRange] = useState<DayRange>(() => todayRange());

  const selectTab = (id: string) => {
    if (id === "daily-summary") setDayRange(todayRange());
    setSelectedTab(id as CardType);
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
      const stacks = await listStacks();
      let loaded: Stack;
      if (stacks.length > 0) {
        const result = await loadStack(stacks[0].id);
        if (!result.ok) {
          setLoadState({ kind: "error", message: result.error.message });
          return;
        }
        loaded = result.value;
      } else {
        const starter = buildStarterStack({
          stackId: crypto.randomUUID(),
          stockCardId: crypto.randomUUID(),
          salesCardId: crypto.randomUUID(),
          debtsCardId: crypto.randomUUID(),
          summaryCardId: crypto.randomUUID(),
        });
        const saved = await saveStack(starter);
        if (!saved.ok) {
          setLoadState({ kind: "error", message: saved.error.message });
          return;
        }
        loaded = starter;
      }
      latestStackRef.current = loaded;
      setStack(loaded);
      setLoadState({ kind: "ready" });
    })();
  }, []);

  const enqueueSave = useCallback(() => {
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      const latest = latestStackRef.current;
      if (!latest) return;
      let result;
      try {
        result = await saveStack(latest);
      } catch {
        result = null;
      }
      if (result && result.ok) setSaveError(null);
      else
        setSaveError(
          result && !result.ok
            ? result.error.message
            : STORAGE_ERROR_MESSAGES.SAVE_FAILED,
        );
    });
  }, []);

  const onStackChange = useCallback(
    (newStack: Stack) => {
      latestStackRef.current = newStack;
      setStack(newStack);
      enqueueSave();
    },
    [enqueueSave],
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
  const summaryCard = stack?.cards.find((c) => c.type === "daily-summary");
  const tabs: { id: CardType; label: string }[] = [
    { id: stockCard?.type ?? "stock", label: "Stock" },
    { id: salesCard?.type ?? "sales-log", label: "Sales log" },
    { id: debtsCard?.type ?? "debts", label: "Debts" },
    { id: summaryCard?.type ?? "daily-summary", label: "Daily summary" },
  ];

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
      {loadState.kind === "loading" && <p>Opening your shop…</p>}
      {loadState.kind === "error" && <p role="alert">{loadState.message}</p>}
      {loadState.kind === "ready" && stack && stockCard && (
        <>
          <TabBar tabs={tabs} selectedId={selectedTab} onSelect={selectTab} />
          <div
            role="tabpanel"
            id={`panel-${selectedTab}`}
            aria-labelledby={`tab-${selectedTab}`}
          >
            {selectedTab === "stock" && (
              <StockCardView
                stack={stack}
                card={stockCard}
                onStackChange={onStackChange}
                salesCardId={salesCard?.id}
              />
            )}
            {selectedTab === "sales-log" && salesCard && (
              <SalesLogCardView stack={stack} card={salesCard} />
            )}
            {selectedTab === "debts" && (
              <DebtsPanel
                stack={stack}
                card={debtsCard}
                onStackChange={onStackChange}
              />
            )}
            {selectedTab === "daily-summary" && (
              <DailySummaryCardView stack={stack} dayRange={dayRange} />
            )}
          </div>
        </>
      )}
    </main>
  );
}
