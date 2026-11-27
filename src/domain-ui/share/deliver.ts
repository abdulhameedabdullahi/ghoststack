export type ShareOutcome =
  | { kind: "shared" }
  | { kind: "opened" }
  | { kind: "copied" }
  | { kind: "cancelled" }
  | { kind: "manual"; text: string };

export interface ShareEnvironment {
  canShare(text: string): boolean;
  share(text: string): Promise<void>;
  isOnline(): boolean;
  openUrl(url: string): boolean;
  writeClipboard(text: string): Promise<void>;
}

function isAbort(error: unknown): boolean {
  try {
    return (error as { name?: unknown } | null | undefined)?.name === "AbortError";
  } catch {
    return false;
  }
}

function safeBool(fn: () => boolean): boolean {
  try {
    return fn() === true;
  } catch {
    return false;
  }
}

/**
 * Tries the share sheet, then the wa.me link, then the clipboard, then
 * returns the text for manual copying. Never rejects.
 */
export async function deliverMessage(
  text: string,
  env: ShareEnvironment,
): Promise<ShareOutcome> {
  try {
    // (a) share sheet
    if (safeBool(() => env.canShare(text))) {
      try {
        await env.share(text);
        return { kind: "shared" };
      } catch (error) {
        if (isAbort(error)) return { kind: "cancelled" };
      }
    }

    // (b) wa.me link
    if (safeBool(() => env.isOnline())) {
      try {
        // encodeURIComponent throws on lone surrogates, so replace them with U+FFFD.
        const wellFormed = text.replace(
          /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
          "\uFFFD",
        );
        const url = "https://wa.me/?text=" + encodeURIComponent(wellFormed);
        if (env.openUrl(url) === true) return { kind: "opened" };
      } catch {
        // fall through to clipboard
      }
    }

    // (c) clipboard
    try {
      await env.writeClipboard(text);
      return { kind: "copied" };
    } catch {
      // fall through to manual
    }
  } catch {
    // fall through to manual
  }
  return { kind: "manual", text };
}
