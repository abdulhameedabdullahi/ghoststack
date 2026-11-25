import { useRef } from "react";
import type { KeyboardEvent } from "react";
import "./TabBar.css";

export interface TabBarProps {
  tabs: { id: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
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
            {selected && (
              <span className="tab-bar__marker" aria-hidden="true">
                ▸
              </span>
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default TabBar;
