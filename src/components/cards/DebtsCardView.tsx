import { useEffect, useRef, useState } from "react";
import type { DebtsCard, Stack } from "../../domain/types";
import {
  ERROR_MESSAGES,
  debtsByCustomer,
  debtsUnpaidFirst,
  recordDebt,
  settleDebt,
  totalOwed,
} from "../../domain";
import { debtFieldErrorFor } from "../../domain-ui/debtErrors";
import { parseKobo } from "../../domain-ui/money";
import { formatDisplay } from "../formatMoney";
import { friendlyTime } from "../friendlyTime";
import { Button } from "../Button";
import { Card } from "../Card";
import { Ghost } from "../Ghost";
import { DebtForm } from "./DebtForm";
import "./DebtsCardView.css";

type FormMode = { kind: "closed" } | { kind: "add" };

type ConfirmMode =
  | { kind: "closed" }
  | { kind: "confirm-pay"; debtId: string };

interface DebtFormState {
  customerText: string;
  amountText: string;
  customerError?: string;
  amountError?: string;
  formError?: string;
}

type PendingFocus =
  | { kind: "record" }
  | { kind: "pay"; debtId: string }
  | undefined;

const ID_PREFIX = "debt-form";

/** Escapes a value for use inside a quoted attribute selector. */
function escapeAttr(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&").replace(/\n/g, "\\a ");
}

export interface DebtsCardViewProps {
  stack: Stack;
  card: DebtsCard;
  onStackChange: (s: Stack) => void;
}

/** Play-mode view of the Debts card. */
export function DebtsCardView({ stack, card, onStackChange }: DebtsCardViewProps) {
  // Refs for the flows added in later tasks (form, confirmation, focus).
  const rootRef = useRef<HTMLDivElement | null>(null);
  const recordButtonRef = useRef<HTMLButtonElement | null>(null);

  const [formMode, setFormMode] = useState<FormMode>({ kind: "closed" });
  const [debtForm, setDebtForm] = useState<DebtFormState>({
    customerText: "",
    amountText: "",
  });
  const notYetButtonRef = useRef<HTMLButtonElement | null>(null);
  const [confirm, setConfirm] = useState<ConfirmMode>({ kind: "closed" });
  const [settleError, setSettleError] = useState<string | undefined>(undefined);
  const [notice, setNotice] = useState("");
  const noticeTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [pendingFocus, setPendingFocus] = useState<PendingFocus>(undefined);

  const showNotice = (text: string) => {
    if (noticeTimeout.current !== undefined) clearTimeout(noticeTimeout.current);
    setNotice(text);
    noticeTimeout.current = setTimeout(() => {
      noticeTimeout.current = undefined;
      setNotice("");
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (noticeTimeout.current !== undefined) {
        clearTimeout(noticeTimeout.current);
      }
    };
  }, []);

  // Move focus to the customer Field when the form opens.
  useEffect(() => {
    if (formMode.kind === "add") {
      document.getElementById(`${ID_PREFIX}-customer`)?.focus();
    }
  }, [formMode.kind]);

  // Focus "Not yet" when a confirmation opens.
  useEffect(() => {
    if (confirm.kind === "confirm-pay") {
      notYetButtonRef.current?.focus();
    }
  }, [confirm]);

  // Return focus to the opener after a form or confirmation closes.
  // Falls back to "Record a debt" if the opener is gone.
  useEffect(() => {
    if (pendingFocus === undefined) return;
    let target: HTMLElement | null = null;
    if (pendingFocus.kind === "pay") {
      target =
        rootRef.current?.querySelector<HTMLElement>(
          `[data-debt-pay-button="${escapeAttr(pendingFocus.debtId)}"]`,
        ) ?? null;
    } else {
      target = recordButtonRef.current;
    }
    (target ?? recordButtonRef.current)?.focus();
    setPendingFocus(undefined);
  }, [pendingFocus, card.debts]);

  const openForm = () => {
    setDebtForm({ customerText: "", amountText: "" });
    setFormMode({ kind: "add" });
  };

  const closeForm = () => {
    setFormMode({ kind: "closed" });
    setPendingFocus({ kind: "record" });
  };

  const handleSubmit = (customerText: string, amountText: string) => {
    const typed = { customerText, amountText };
    const parsed = parseKobo(amountText);
    if (!parsed.ok) {
      setDebtForm({
        ...typed,
        amountError: debtFieldErrorFor(parsed.error.code),
      });
      return;
    }
    const result = recordDebt({
      stack,
      debtsCardId: card.id,
      customer: customerText,
      amount: parsed.value,
      debtId: crypto.randomUUID(),
      date: new Date().toISOString(),
    });
    if (!result.ok) {
      const { code, message } = result.error;
      if (code === "BAD_CUSTOMER") {
        setDebtForm({ ...typed, customerError: message });
      } else if (code === "BAD_AMOUNT" || code === "AMOUNT_TOO_BIG") {
        setDebtForm({ ...typed, amountError: debtFieldErrorFor(code) });
      } else {
        setDebtForm({ ...typed, formError: message });
      }
      return;
    }
    setFormMode({ kind: "closed" });
    onStackChange(result.value);
    showNotice("Debt recorded");
    setPendingFocus({ kind: "record" });
  };

  const openConfirmPay = (debtId: string) => {
    setSettleError(undefined);
    setConfirm({ kind: "confirm-pay", debtId });
  };

  const handleConfirmPay = (debtId: string) => {
    const result = settleDebt({ stack, debtsCardId: card.id, debtId });
    setConfirm({ kind: "closed" });
    if (result.ok) {
      onStackChange(result.value);
      showNotice("Debt marked as paid");
    } else {
      setSettleError(result.error.message);
    }
    setPendingFocus({ kind: "pay", debtId });
  };

  const handleNotYet = (debtId: string) => {
    setConfirm({ kind: "closed" });
    setPendingFocus({ kind: "pay", debtId });
  };

  const confirmingDebt =
    confirm.kind === "confirm-pay"
      ? card.debts.find((d) => d.id === confirm.debtId)
      : undefined;

  const owed = totalOwed(card.debts);
  const byCustomer = debtsByCustomer(card.debts);
  const ordered = debtsUnpaidFirst(card.debts);

  const recordButton = (
    <Button buttonRef={recordButtonRef} onClick={openForm}>
      Record a debt
    </Button>
  );

  return (
    <Card title={card.title}>
      <div ref={rootRef} className="debts-card">
        <p aria-live="polite">{notice}</p>

        {formMode.kind === "add" && (
          <DebtForm
            idPrefix={ID_PREFIX}
            initialCustomerText={debtForm.customerText}
            initialAmountText={debtForm.amountText}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            customerError={debtForm.customerError}
            amountError={debtForm.amountError}
            formError={debtForm.formError}
          />
        )}

        {confirm.kind === "confirm-pay" && confirmingDebt && (
          <div
            className="debts-card__confirm"
            role="alertdialog"
            aria-labelledby="debt-pay-title"
          >
            <p id="debt-pay-title" className="debts-card__confirm-text">
              Mark {confirmingDebt.customer}'s debt of{" "}
              {formatDisplay(confirmingDebt.amount)} as paid?
            </p>
            <Button onClick={() => handleConfirmPay(confirm.debtId)}>
              Yes, mark as paid
            </Button>
            <Button
              buttonRef={notYetButtonRef}
              onClick={() => handleNotYet(confirm.debtId)}
            >
              Not yet
            </Button>
          </div>
        )}

        <p className="debts-card__total">
          <span className="debts-card__label">Money owed to you: </span>
          <strong>
            {Number.isSafeInteger(owed)
              ? formatDisplay(owed)
              : ERROR_MESSAGES.AMOUNT_TOO_BIG}
          </strong>
        </p>

        {card.debts.length === 0 ? (
          <div className="debts-card__empty">
            <Ghost size={48} />
            <p>You have no debts recorded yet.</p>
            <p className="empty-tagline">Nobody owes you anything right now.</p>
            {recordButton}
          </div>
        ) : (
          <>
            <div className="debts-card__add">{recordButton}</div>

            <h3 className="debts-card__heading">Who owes you</h3>
            {!byCustomer.ok ? (
              <p role="alert">{byCustomer.error.message}</p>
            ) : byCustomer.value.length === 0 ? (
              <p>No one owes you money right now.</p>
            ) : (
              <ul className="debts-card__list">
                {byCustomer.value.map((c, index) => (
                  <li key={`${index}-${c.name}`} className="debts-card__row">
                    <span className="debts-card__name">{c.name}</span>
                    <span className="debts-card__detail">
                      {formatDisplay(c.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="debts-card__heading">All debts</h3>
            {settleError !== undefined && <p role="alert">{settleError}</p>}
            <ul className="debts-card__list">
              {ordered.map((debt) => (
                <li key={debt.id} className="debts-card__row">
                  <span className="debts-card__name">{debt.customer}</span>
                  <span className="debts-card__detail">
                    {formatDisplay(debt.amount)}
                  </span>
                  <span className="debts-card__detail">
                    {friendlyTime(debt.date)}
                  </span>
                  <span className="debts-card__status">
                    {debt.status === "unpaid" ? (
                      <>
                        <span aria-hidden="true">●</span> Not paid
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true">✓</span> Paid
                      </>
                    )}
                  </span>
                  {debt.status === "unpaid" && (
                    <div className="debts-card__actions">
                      <Button
                        onClick={() => openConfirmPay(debt.id)}
                        dataAttributes={{ "data-debt-pay-button": debt.id }}
                      >
                        Mark as paid
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}

export default DebtsCardView;
