export const SHARE_SHARED = "Shared. Thank you!";
export const SHARE_OPENED = "The ghost has packed your message. Tap send in WhatsApp.";
export const SHARE_COPIED = "Copied. Paste it in WhatsApp.";
export const SHARE_MANUAL = "Could not share. Select the message below and copy it.";
export const SHARE_CANCELLED = "";

export const SHARE_TEXTAREA_LABEL = "Your message";
export const SHARE_DONE_LABEL = "Done";

export type ShareOutcome = "shared" | "opened" | "copied" | "cancelled" | "manual";

export const SHARE_OUTCOME_MESSAGES: Record<ShareOutcome, string> = {
  shared: SHARE_SHARED,
  opened: SHARE_OPENED,
  copied: SHARE_COPIED,
  cancelled: SHARE_CANCELLED,
  manual: SHARE_MANUAL,
};
