import "./ModeSwitch.css";

export type Mode = "play" | "builder";

export interface ModeSwitchProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

const OPTIONS: { id: Mode; label: string }[] = [
  { id: "play", label: "▸ Play" },
  { id: "builder", label: "🛠 Builder" },
];

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div className="mode-switch" role="group" aria-label="Mode">
      {OPTIONS.map((opt) => {
        const active = opt.id === mode;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            className={`mode-switch__button${active ? " mode-switch__button--active" : ""}`}
            onClick={() => onChange(opt.id)}
          >
            <span>{opt.label}</span>
            {active && <span className="mode-switch__current"> (current)</span>}
          </button>
        );
      })}
    </div>
  );
}

export default ModeSwitch;
