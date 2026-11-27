// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "../../test/setup";
import { GhostProvider, useGhost } from "./GhostProvider";
import { useGhostError } from "./useGhostError";

// stamp increments once per react() call, so it counts errorShown reactions.
function Probe({ message }: { message?: string | null }) {
  useGhostError(message);
  const { stamp } = useGhost();
  return <span data-testid="stamp">{stamp}</span>;
}

const stamp = () => Number(screen.getByTestId("stamp").textContent);

afterEach(cleanup);

describe("useGhostError", () => {
  it("does nothing for undefined, null and empty string", () => {
    const { rerender } = render(
      <GhostProvider>
        <Probe message={undefined} />
      </GhostProvider>,
    );
    const base = stamp();
    for (const m of ["", null, undefined, ""]) {
      rerender(
        <GhostProvider>
          <Probe message={m} />
        </GhostProvider>,
      );
    }
    expect(stamp()).toBe(base);
  });

  it("reacts once per new text, not on re-render with same text", () => {
    const wrap = (m: string) => (
      <GhostProvider>
        <Probe message={m} />
      </GhostProvider>
    );
    const { rerender } = render(
      <GhostProvider>
        <Probe message={undefined} />
      </GhostProvider>,
    );
    const base = stamp();
    rerender(wrap("boom"));
    expect(stamp()).toBe(base + 1);
    rerender(wrap("boom"));
    expect(stamp()).toBe(base + 1);
    rerender(wrap("bang"));
    expect(stamp()).toBe(base + 2);
  });

  it("does not throw without a provider", () => {
    expect(() => render(<Probe message="oops" />)).not.toThrow();
    expect(stamp()).toBe(0);
  });
});
