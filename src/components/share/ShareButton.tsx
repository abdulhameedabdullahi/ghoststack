import { useRef } from "react";
import { Button } from "../Button";
import type { MessageText, ShareResult } from "../../domain-ui/share";
import { useShare } from "./ShareProvider";

export interface ShareButtonProps {
  label: string;
  ariaLabel?: string;
  makeText: () => ShareResult<MessageText>;
}

export function ShareButton({ label, ariaLabel, makeText }: ShareButtonProps) {
  const ctx = useShare();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  if (!ctx) return null;
  const { busy, share } = ctx;
  return (
    <Button
      buttonRef={buttonRef}
      ariaLabel={ariaLabel}
      ariaDisabled={busy}
      onClick={() => {
        void share(makeText, buttonRef.current);
      }}
    >
      {label}
    </Button>
  );
}

export default ShareButton;
