import { useRef } from "react";
import type { KeyboardEvent } from "react";
import "./TabBar.css";

export interface TabBarProps {
  tabs: { id: string; label: string; type?: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}

// 16×16 hand-drawn pixel icons per card type. "#" = filled cell.
const PIXEL_ICONS: Record<string, string[]> = {
  // Crate with shelves → Stock
  stock: [
    "................",
    "....########....",
    "...#........#...",
    "...#..####..#...",
    "...#........#...",
    "...#..####..#...",
    "...#........#...",
    "...#..####..#...",
    "...#........#...",
    "...#..####..#...",
    "...#........#...",
    "....########....",
    "................",
    "................",
    "................",
    "................",
  ],
  // Document with alternating text lines → Sales log
  "sales-log": [
    "................",
    "..###########...",
    "..#.........#...",
    "..#.#######.#...",
    "..#.........#...",
    "..#.#####...#...",
    "..#.........#...",
    "..#.#######.#...",
    "..#.........#...",
    "..#.#####...#...",
    "..#.........#...",
    "..###########...",
    "................",
    "................",
    "................",
    "................",
  ],
  // Coin with ₦ inside → Debts (money owed)
  debts: [
    "................",
    ".....######.....",
    "....#......#....",
    "...#.##..##.#...",
    "...#.##..##.#...",
    "...#.######.#...",
    "...#.##..##.#...",
    "...#.##..##.#...",
    "...#........#...",
    "....#......#....",
    ".....######.....",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  // Ascending bar chart → Daily summary
  "daily-summary": [
    "................",
    "..............##",
    "..............##",
    "..............##",
    "..........##..##",
    "..........##..##",
    "......##..##..##",
    "......##..##..##",
    "..##..##..##..##",
    "..##..##..##..##",
    "..##..##..##..##",
    "################",
    "................",
    "................",
    "................",
    "................",
  ],
};

function PixelTabIcon({ type }: { type: string }) {
  const rows = PIXEL_ICONS[type];
  if (!rows) return null;
  const cells: { x: number; y: number }[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === "#") cells.push({ x, y });
    }
  });
  return (
    <svg
      viewBox="0 0 16 16"
      width={24}
      height={24}
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className="tab-bar__icon"
    >
      {cells.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
      ))}
    </svg>
  );
}

export function TabBar({ tabs, selectedId, onSelect }: TabBarProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    let next: number;
    switch (e.key) {
      case "ArrowLeft":
        next = index === 0 ? last : index - 1;
        break;
      case "ArrowRight":
        next = index === last ? 0 : index + 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    onSelect(tabs[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="tab-bar" role="tablist">
      {tabs.map((tab, i) => {
        const selected = tab.id === selectedId;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className={`tab-bar__tab${selected ? " tab-bar__tab--selected" : ""}`}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            {tab.type && <PixelTabIcon type={tab.type} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default TabBar;
