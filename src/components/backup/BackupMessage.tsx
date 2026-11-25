import { useEffect, useRef } from "react";
import type { BackupMessageState } from "./backupMessages";

export interface BackupMessageProps {
  message: BackupMessageState;
}

export function BackupMessage({ message }: BackupMessageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seq = message?.seq;
  const kind = message?.kind;

  // Focus only on a new error. Success never moves focus.
  useEffect(() => {
    if (kind === "error") ref.current?.focus();
  }, [seq, kind]);

  if (!message) return null;
  const isError = message.kind === "error";

  return (
    <div
      ref={ref}
      role={isError ? "alert" : "status"}
      tabIndex={-1}
      className={`backup-message backup-message--${message.kind}`}
    >
      <span className="backup-message__icon" aria-hidden="true">
        {isError ? "⚠" : "✔"}
      </span>
      <span className="backup-message__text">{message.text}</span>
    </div>
  );
}

export default BackupMessage;
