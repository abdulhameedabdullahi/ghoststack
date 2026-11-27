import { useEffect, useRef } from "react";
import { BRAND_NAME, BRAND_SUBLINE, BRAND_TAGLINE } from "../brand/brand";
import { Ghost } from "./Ghost";
import "./AboutPanel.css";

interface Props {
  onClose: () => void;
}

export function AboutPanel({ onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    el.showModal?.();
    el.addEventListener("close", onClose);
    return () => {
      el.removeEventListener("close", onClose);
    };
  }, [onClose]);

  return (
    <dialog ref={dialogRef} className="about-panel" aria-label={`About ${BRAND_NAME}`}>
      <div className="about-panel__body">
        <Ghost size={96} title={`${BRAND_NAME} mark`} />
        <h2 className="about-panel__name">{BRAND_NAME}</h2>
        <p className="about-panel__tagline">{BRAND_TAGLINE}</p>
        <p className="about-panel__subline">{BRAND_SUBLINE}</p>
        <form method="dialog" className="about-panel__footer">
          <button
            type="submit"
            className="about-panel__close"
            onClick={() => dialogRef.current?.close()}
          >
            Close
          </button>
        </form>
      </div>
    </dialog>
  );
}
