import { Button } from "../Button";
import { SHARE_DONE_LABEL, SHARE_TEXTAREA_LABEL } from "./shareMessages";
import { useShare } from "./ShareProvider";
import "./ShareStatus.css";

export function ShareStatus() {
  const share = useShare();
  const noticeText = share?.noticeText ?? "";
  const manualText = share?.manualText;

  return (
    <div className="share-status">
      <p
        role="status"
        className={`share-status__text${noticeText ? " share-status__text--visible" : ""}`}
      >
        {noticeText}
      </p>
      {share && manualText !== undefined && (
        <div className="share-status__manual">
          <label htmlFor="share-manual-text" className="share-status__label">
            {SHARE_TEXTAREA_LABEL}
          </label>
          <textarea
            id="share-manual-text"
            className="share-status__textarea"
            readOnly
            rows={6}
            value={manualText}
            onFocus={(e) => e.currentTarget.select()}
            ref={share.textareaRef}
          />
          <Button onClick={share.done}>{SHARE_DONE_LABEL}</Button>
        </div>
      )}
    </div>
  );
}

export default ShareStatus;
