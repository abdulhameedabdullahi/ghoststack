import { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { GhostCompanion } from "./components/ghost/GhostCompanion";
import { useGhost } from "./components/ghost/GhostProvider";
import { useGhostError } from "./components/ghost/useGhostError";
import { Button } from "./components/Button";
import "./components/AppBar.css";
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
import { requestPersistentStorage } from "./pwa/requestPersistentStorage";
import { readLastOpenedId, rememberLastOpenedId } from "./storage/lastOpened";
import { useServiceWorkerNotices } from "./pwa/useServiceWorkerNotices";
import { NoticeArea } from "./components/NoticeArea";
import {
  BACKUP_LOADED,
  BACKUP_READ_FAILED,
  BACKUP_READY,
  BACKUP_SAVE_FAILED,
  type BackupMessageState,
} from "./components/backup/backupMessages";
import { downloadText } from "./components/backup/downloadText";
import { readFileText } from "./components/backup/readFileText";
import { makeUnusedStackId } from "./storage/freshStackId";
import {
  BACKUP_ERROR_MESSAGES,
  SIZE_LIMIT,
  backupFileName,
  parseBackup,
  serializeStack,
} from "./domain-ui/backup";

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
  // Mirrors what enqueueSave passes to setSaveError, readable from async code.
  const saveErrorRef = useRef<string | null>(null);
  const persistAskedRef = useRef(false);
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
  const { notice, closeOffline, applyUpdate } = useServiceWorkerNotices();
  const [backupMessage, setBackupMessage] = useState<BackupMessageState>(null);
  const backupSeqRef = useRef(0);
  const [reloading, setReloading] = useState(false);
  const loadBusyRef = useRef(false);
  const [loadBusy, setLoadBusy] = useState(false);
  const [focusFirstTab, setFocusFirstTab] = useState(false);

  // A message shown next to the backup buttons is dropped when the mode changes.
  useEffect(() => {
    setBackupMessage((prev) =>
      prev && prev.place === "controls" ? null : prev,
    );
  }, [mode]);

  const visible = stack ? visibleCards(stack) : [];
  const selectedCard = visible.find((c) => c.id === selectedCardId) ?? visible[0];
  const tabs = visible.map((c) => ({ id: c.id, label: c.title, type: c.type }));

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

  // Asks the browser to keep our data, once, after the first good save.
  const notePersistOnce = useCallback(() => {
    if (persistAskedRef.current) return;
    persistAskedRef.current = true;
    requestPersistentStorage();
  }, []);

  // Waits until no more saves are queued. Returns the latest save error.
  const drainSaves = useCallback(async (): Promise<string | null> => {
    let q: Promise<void>;
    do {
      q = saveQueueRef.current;
      await q;
    } while (q !== saveQueueRef.current);
    return saveErrorRef.current;
  }, []);

  const handleReload = useCallback(async () => {
    setReloading(true);
    try {
      const saveProblem = await drainSaves();
      if (saveProblem) {
        backupSeqRef.current += 1;
        setBackupMessage({
          seq: backupSeqRef.current,
          kind: "error",
          text: saveProblem,
          place: "notice",
        });
        return;
      }
      try {
        await applyUpdate();
      } catch {
        // The notice stays open so the owner can try again.
      }
    } finally {
      setReloading(false);
    }
  }, [drainSaves, applyUpdate]);

  const handleSaveBackup = useCallback(async () => {
    const show = (kind: "success" | "error", text: string) => {
      backupSeqRef.current += 1;
      setBackupMessage({
        seq: backupSeqRef.current,
        kind,
        text,
        place: "controls",
      });
    };
    try {
      await drainSaves();
      const current = latestStackRef.current;
      if (!current) return;
      const now = new Date();
      const text = serializeStack(current);
      const name = backupFileName(current.name, {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
      });
      downloadText(text, name, "application/json");
      show("success", BACKUP_READY);
    } catch {
      show("error", BACKUP_SAVE_FAILED);
    }
  }, [drainSaves]);

  // Focus the first tab after a backup is loaded and Play mode is showing.
  useEffect(() => {
    if (!focusFirstTab) return;
    document.querySelector<HTMLElement>('[role="tab"]')?.focus();
    setFocusFirstTab(false);
  }, [focusFirstTab, mode, stack]);

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
          saveErrorRef.current = null;
          setSaveError(null);
          notePersistOnce();
          await refreshSavedStacks();
        } else {
          const message =
            result && !result.ok
              ? result.error.message
              : STORAGE_ERROR_MESSAGES.SAVE_FAILED;
          saveErrorRef.current = message;
          setSaveError(message);
        }
      } finally {
        setSavesInFlight((n) => n - 1);
      }
    });
  }, [refreshSavedStacks, notePersistOnce]);

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

  const handleLoadFile = useCallback(
    async (file: File) => {
      if (loadBusyRef.current) return;
      loadBusyRef.current = true;
      setLoadBusy(true);
      const fail = (text: string) => {
        backupSeqRef.current += 1;
        setBackupMessage({
          seq: backupSeqRef.current,
          kind: "error",
          text,
          place: "controls",
        });
      };
      try {
        if (file.size > SIZE_LIMIT) return fail(BACKUP_ERROR_MESSAGES.TOO_LARGE);
        let text: string;
        try {
          text = await readFileText(file);
        } catch {
          return fail(BACKUP_READ_FAILED);
        }
        const freshId = await makeUnusedStackId();
        if (freshId === null) return fail(STORAGE_ERROR_MESSAGES.SAVE_FAILED);
        const parsed = parseBackup(text, freshId);
        if (!parsed.ok) return fail(parsed.error.message);
        await drainSaves();
        const saved = await saveStack(parsed.value);
        if (!saved.ok) return fail(saved.error.message);
        notePersistOnce();
        await drainSaves();
        await openStack(parsed.value.id);
        if (latestStackRef.current?.id !== parsed.value.id) {
          void refreshSavedStacks();
          return fail(STORAGE_ERROR_MESSAGES.UNREADABLE_DATA);
        }
        setFocusFirstTab(true);
        backupSeqRef.current += 1;
        setBackupMessage({
          seq: backupSeqRef.current,
          kind: "success",
          text: BACKUP_LOADED,
          place: "notice",
        });
      } catch {
        void refreshSavedStacks();
        fail(STORAGE_ERROR_MESSAGES.SAVE_FAILED);
      } finally {
        loadBusyRef.current = false;
        setLoadBusy(false);
      }
    },
    [drainSaves, notePersistOnce, openStack, refreshSavedStacks],
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

  const { react } = useGhost();
  useGhostError(saveError);
  useGhostError(switchError);
  useGhostError(loadState.kind === "error" ? loadState.message : null);

  const toggleTheme = () => {
    const next = midnight ? "light" : "midnight";
    react({ type: "midnightToggled", on: next === "midnight" });
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
      <div className="app-bar">
        <AppHeader />
        <div className="app-bar__controls">
          {loadState.kind === "ready" && stack && !starterChooserOpen && (
            <ModeSwitch mode={mode} onChange={setMode} />
          )}
          <button
            className="moon-button"
            type="button"
            aria-label="Toggle midnight mode"
            aria-pressed={midnight}
            onClick={toggleTheme}
          >
            <span aria-hidden="true">☾</span>
          </button>
        </div>
      </div>
      <GhostCompanion />
      <NoticeArea
        notice={notice}
        onCloseOffline={closeOffline}
        onReload={() => void handleReload()}
        reloading={reloading}
        backupMessage={backupMessage}
        onCloseBackupMessage={() => setBackupMessage(null)}
      />
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
            {mode === "builder" ? (
              <BuilderPanel
                stack={stack}
                onStackChange={onStackChange}
                onOpenStarterChooser={() => setStarterChooserOpen(true)}
                backup={{
                  onSave: () => handleSaveBackup(),
                  onLoadFile: handleLoadFile,
                  busy: loadBusy,
                  message:
                    backupMessage?.place === "controls" ? backupMessage : null,
                }}
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
