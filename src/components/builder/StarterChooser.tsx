import { useEffect, useRef, useState } from "react";
import { Button } from "../Button";
import { Card } from "../Card";
import { Ghost } from "../Ghost";
import "./StarterChooser.css";

export type StarterKind = "provisions" | "farm-stall";

export interface StarterChooserProps {
  onPick: (
    kind: StarterKind,
    withSamples: boolean,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Present only when opened from the Builder panel. */
  onCancel?: () => void;
}

interface Pick {
  kind: StarterKind;
  withSamples: boolean;
}

const CHOICES: { kind: StarterKind; title: string; text: string; action: string }[] = [
  {
    kind: "provisions",
    title: "Provisions shop",
    text: "For a shop that sells packed goods, drinks and daily needs.",
    action: "Use Provisions shop",
  },
  {
    kind: "farm-stall",
    title: "Farm produce stall",
    text: "For a stall that sells fresh fruit, vegetables and eggs.",
    action: "Use Farm produce stall",
  },
];

/** Lets the owner raise a new shop from one of two starters. */
export function StarterChooser({ onPick, onCancel }: StarterChooserProps) {
  const [withSamples, setWithSamples] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [lastPick, setLastPick] = useState<Pick | undefined>(undefined);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function run(pick: Pick) {
    if (pending) return;
    setLastPick(pick);
    setError(undefined);
    setPending(true);
    let result: { ok: true } | { ok: false; message: string };
    try {
      result = await onPick(pick.kind, pick.withSamples);
    } catch {
      result = { ok: false, message: "We could not save your shop. Please try again." };
    }
    if (!mounted.current) return;
    setPending(false);
    if (!result.ok) setError(result.message);
  }

  return (
    <div className="starter-chooser">
      <div className="starter-chooser__head">
        <Ghost size={48} />
        <h2 className="starter-chooser__heading">Choose a starter</h2>
      </div>
      <p className="starter-chooser__intro">Pick the one that is closest to your business.</p>
      <p className="starter-chooser__extra">Pick a starter to raise your shop.</p>

      <label className="starter-chooser__samples">
        <input
          type="checkbox"
          checked={withSamples}
          disabled={pending}
          onChange={(e) => setWithSamples(e.target.checked)}
        />
        <span>Add sample items</span>
      </label>

      {CHOICES.map((c) => (
        <Card key={c.kind} title={c.title}>
          <p className="starter-chooser__text">{c.text}</p>
          <Button
            disabled={pending}
            onClick={() => void run({ kind: c.kind, withSamples })}
          >
            {pending && lastPick?.kind === c.kind ? "Saving..." : c.action}
          </Button>
        </Card>
      ))}

      {error !== undefined && lastPick !== undefined && (
        <div className="starter-chooser__error">
          <p role="alert">{error}</p>
          <Button disabled={pending} onClick={() => void run(lastPick)}>
            Try again
          </Button>
        </div>
      )}

      {onCancel !== undefined && (
        <div className="starter-chooser__cancel">
          <Button disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export default StarterChooser;
