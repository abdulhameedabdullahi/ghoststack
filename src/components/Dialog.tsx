import { useEffect, useRef } from 'react';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import './Dialog.css';

export interface DialogProps {
  /** Id of the heading the caller renders inside the Dialog. */
  titleId: string;
  children: ReactNode;
  /** Caller's close handler. It also returns focus to the Opener. */
  onClose: () => void;
  /** Element to focus first. Defaults to the first focusable control. */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

const FOCUSABLE =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  );
}

export function Dialog({ titleId, children, onClose, initialFocusRef }: DialogProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target =
      initialFocusRef?.current ??
      (rootRef.current ? getFocusable(rootRef.current)[0] : undefined);
    target?.focus();
    // Runs once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !rootRef.current) return;
    const items = getFocusable(rootRef.current);
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="dialog__backdrop">
      <div
        ref={rootRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
