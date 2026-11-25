import type { ReactNode } from "react";
import type { BackupMessageState } from "./backup/backupMessages";
import { Button } from "./Button";
import "./Button.css";
import "./NoticeArea.css";

export interface NoticeAreaProps {
  notice: "update" | "offline" | null;
  onCloseOffline: () => void;
  onReload: () => void;
  /** True while the reload waits for saves to finish. */
  reloading: boolean;
  /** Only shown when place is "notice". */
  backupMessage: BackupMessageState;
  onCloseBackupMessage: () => void;
}

function NoticeRow({
  icon,
  text,
  children,
}: {
  icon: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <div className="notice-area__notice" role="status">
      <span className="notice-area__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="notice-area__text">{text}</span>
      {children}
    </div>
  );
}

// Never calls focus() and never uses autoFocus, so it cannot take focus away.
export function NoticeArea({
  notice,
  onCloseOffline,
  onReload,
  reloading,
  backupMessage,
  onCloseBackupMessage,
}: NoticeAreaProps) {
  const showBackup = backupMessage !== null && backupMessage.place === "notice";
  if (notice === null && !showBackup) return null;

  return (
    <div className="notice-area">
      {notice === "update" && (
        <NoticeRow icon="↻" text="A new version is ready. Reload to update.">
          <button
            type="button"
            className="button button--main notice-area__button"
            aria-disabled={reloading}
            onClick={() => {
              if (!reloading) onReload();
            }}
          >
            Reload
          </button>
        </NoticeRow>
      )}
      {notice === "offline" && (
        <NoticeRow icon="✔" text="Ready for offline use">
          <Button onClick={onCloseOffline}>Close</Button>
        </NoticeRow>
      )}
      {showBackup && backupMessage && (
        <NoticeRow
          icon={backupMessage.kind === "error" ? "⚠" : "✔"}
          text={backupMessage.text}
        >
          <Button onClick={onCloseBackupMessage}>Close</Button>
        </NoticeRow>
      )}
    </div>
  );
}

export default NoticeArea;
