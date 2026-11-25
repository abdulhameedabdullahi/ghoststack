// Shared setup for component tests. Import it explicitly from each
// `.test.tsx` file. It is not registered through `setupFiles`, so the
// Node-environment domain tests are not affected.
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

function makeUuid(): `${string}-${string}-${string}-${string}-${string}` {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}` as `${string}-${string}-${string}-${string}-${string}`;
}

if (typeof crypto?.randomUUID !== "function") {
  if (typeof crypto === "undefined") {
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: makeUuid },
      configurable: true,
      writable: true,
    });
  } else {
    Object.defineProperty(crypto, "randomUUID", {
      value: makeUuid,
      configurable: true,
      writable: true,
    });
  }
}
