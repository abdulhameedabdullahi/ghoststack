import type { ShareEnvironment } from "./deliver";

function getNavigator(): Navigator | undefined {
  return typeof navigator === "undefined" ? undefined : navigator;
}

export const browserShareEnvironment: ShareEnvironment = {
  canShare(text: string): boolean {
    const nav = getNavigator();
    if (!nav || typeof nav.share !== "function") return false;
    if (typeof nav.canShare !== "function") return true;
    return nav.canShare({ text }) === true;
  },

  share(text: string): Promise<void> {
    const nav = getNavigator();
    if (!nav || typeof nav.share !== "function") {
      return Promise.reject(new Error("Web Share API unavailable"));
    }
    return nav.share({ text });
  },

  isOnline(): boolean {
    const nav = getNavigator();
    return !nav || nav.onLine !== false;
  },

  openUrl(url: string): boolean {
    if (typeof document === "undefined") return false;
    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      try {
        a.click();
      } finally {
        a.remove();
      }
      return true;
    } catch {
      return false;
    }
  },

  writeClipboard(text: string): Promise<void> {
    const nav = getNavigator();
    if (!nav || !nav.clipboard || typeof nav.clipboard.writeText !== "function") {
      return Promise.reject(new Error("Clipboard API unavailable"));
    }
    return nav.clipboard.writeText(text);
  },
};
