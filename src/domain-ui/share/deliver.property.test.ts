import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { checkProperty, nameArb } from "../../test/shareArbitraries";
import { deliverMessage, type ShareEnvironment, type ShareOutcome } from "./deliver";

type ShareMode = "ok" | "abortDom" | "abortPlain" | "otherError" | "syncThrow";
type OpenMode = "true" | "false" | "throw";
type ClipMode = "ok" | "reject" | "syncThrow";

interface Scenario {
  text: string;
  canShare: boolean;
  share: ShareMode;
  online: boolean;
  open: OpenMode;
  clip: ClipMode;
}

const scenarioArb: fc.Arbitrary<Scenario> = fc.record({
  text: nameArb,
  canShare: fc.boolean(),
  share: fc.constantFrom<ShareMode>("ok", "abortDom", "abortPlain", "otherError", "syncThrow"),
  online: fc.boolean(),
  open: fc.constantFrom<OpenMode>("true", "false", "throw"),
  clip: fc.constantFrom<ClipMode>("ok", "reject", "syncThrow"),
});

function buildEnv(s: Scenario, calls: string[]): ShareEnvironment {
  return {
    canShare: () => {
      calls.push("canShare");
      return s.canShare;
    },
    share: (() => {
      calls.push("share");
      switch (s.share) {
        case "ok":
          return Promise.resolve();
        case "abortDom":
          return Promise.reject(new DOMException("cancelled", "AbortError"));
        case "abortPlain":
          return Promise.reject({ name: "AbortError" });
        case "otherError":
          return Promise.reject(new Error("boom"));
        case "syncThrow":
          throw new Error("sync share failure");
      }
    }) as ShareEnvironment["share"],
    isOnline: () => {
      calls.push("isOnline");
      return s.online;
    },
    openUrl: () => {
      calls.push("openUrl");
      if (s.open === "throw") throw new Error("open failure");
      return s.open === "true";
    },
    writeClipboard: () => {
      calls.push("writeClipboard");
      if (s.clip === "syncThrow") throw new Error("sync clipboard failure");
      return s.clip === "ok"
        ? Promise.resolve()
        : Promise.reject(new Error("clipboard failure"));
    },
  };
}

/** Independent model of the strategy order in requirements 5.3 to 5.6. */
function expected(s: Scenario): ShareOutcome["kind"] {
  if (s.canShare) {
    if (s.share === "ok") return "shared";
    if (s.share === "abortDom" || s.share === "abortPlain") return "cancelled";
  }
  if (s.online && s.open === "true") return "opened";
  if (s.clip === "ok") return "copied";
  return "manual";
}

const KINDS = ["shared", "opened", "copied", "cancelled", "manual"];

describe("deliverMessage property P6", () => {
  it("resolves with the modelled outcome for every combination", async () => {
    // fc.check is synchronous, so run the async property through asyncProperty directly.
    const details = await fc.check(
      fc.asyncProperty(scenarioArb, async (s) => {
        const calls: string[] = [];
        const outcome = await deliverMessage(s.text, buildEnv(s, calls));

        expect(KINDS).toContain(outcome.kind);
        expect(outcome.kind).toBe(expected(s));
        if (outcome.kind === "manual") expect(outcome.text).toBe(s.text);

        if (outcome.kind === "cancelled") {
          expect(calls).toEqual(["canShare", "share"]);
        }
        if (outcome.kind === "shared") {
          expect(calls).toEqual(["canShare", "share"]);
        }
      }),
      { numRuns: 300 },
    );
    if (details.failed) {
      throw new Error(
        `P6 failed. seed: ${details.seed}\ncounterexample: ${fc.stringify(details.counterexample)}\n` +
          `error: ${String(details.errorInstance)}`,
      );
    }
  });

  it("uses checkProperty for the synchronous never-throws guard", () => {
    checkProperty(
      fc.property(nameArb, (text) => {
        const env: ShareEnvironment = {
          canShare: () => {
            throw new Error("x");
          },
          share: () => {
            throw new Error("x");
          },
          isOnline: () => {
            throw new Error("x");
          },
          openUrl: () => {
            throw new Error("x");
          },
          writeClipboard: () => {
            throw new Error("x");
          },
        };
        // Must return a promise (not throw) synchronously.
        const result = deliverMessage(text, env);
        expect(result).toBeInstanceOf(Promise);
        result.catch(() => undefined);
      }),
    );
  });
});
