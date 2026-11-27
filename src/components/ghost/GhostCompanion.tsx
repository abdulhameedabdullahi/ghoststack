import { useRef } from "react";
import { Button } from "../Button";
import { GhostMascot } from "./GhostMascot";
import { useGhost } from "./GhostProvider";
import "./GhostCompanion.css";

export function GhostCompanion() {
  const { active, state, stamp, bubble, react, dismissBubble } = useGhost();
  const pokeRef = useRef<HTMLButtonElement>(null);

  if (!active) return null;

  const dismiss = () => {
    dismissBubble();
    pokeRef.current?.focus();
  };

  return (
    <div className="ghost-companion">
      <button
        ref={pokeRef}
        type="button"
        className="ghost-companion__poke"
        aria-label="Poke the ghost"
        onClick={() => react("poked")}
      >
        <GhostMascot key={stamp} mood={state.mood} nightcap={state.nightcap} />
      </button>
      {bubble && state.mood !== "sleep" && (
        <div className="ghost-bubble">
          <p className="ghost-bubble__text">{bubble}</p>
          <Button onClick={dismiss}>Got it</Button>
        </div>
      )}
    </div>
  );
}

export default GhostCompanion;
