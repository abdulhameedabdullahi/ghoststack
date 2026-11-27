// Frame data for the ghost mascot. Pure: no React import.
import { GHOST_GRID, GHOST_SIZE_CELLS } from "../ghostGrid";
import type { GhostMood } from "./ghostTypes";

export interface Cell {
  x: number;
  y: number;
}

/** Row replacements: row number -> full 16-character row. */
export type RowPatch = Readonly<Record<number, string>>;

/** Arm rows: row number -> two characters for columns 14 and 15 (right arm). */
export type ArmShape = Readonly<Record<number, string>>;

// ---- Eyes (rows 4 to 6) ----
export const EYES = {
  open: {},
  happy: {
    4: "..###.####.###..",
    5: "..##.#.##.#.##..",
    6: "..############..",
  },
  closed: {
    4: "..############..",
    5: "..##..####..##..",
    6: "..############..",
  },
} as const satisfies Record<string, RowPatch>;

// ---- Mouths (rows 9 to 10) ----
export const MOUTHS = {
  smile: {},
  grin: {
    9: "..####....####..",
    10: "..#####..#####..",
  },
  frown: {
    9: "..#####..#####..",
    10: "..####....####..",
  },
  smallO: {
    9: "..#####..#####..",
    10: "..############..",
  },
} as const satisfies Record<string, RowPatch>;

// ---- Arms (right arm shapes; the left arm mirrors them) ----
export const ARMS = {
  none: {},
  up: { 3: ".#", 4: ".#", 5: ".#", 6: "##" },
  upLean: { 3: "#.", 4: "#.", 5: "#.", 6: "#." },
  outHigh: { 7: "##" },
  outLow: { 8: "##" },
  side: { 8: "##" },
  down: { 8: "#.", 9: "#.", 10: "#." },
} as const satisfies Record<string, ArmShape>;

export type EyesName = keyof typeof EYES;
export type MouthName = keyof typeof MOUTHS;
export type ArmName = keyof typeof ARMS;

export interface FrameParts {
  eyes?: EyesName;
  mouth?: MouthName;
  rightArm?: ArmName;
  leftArm?: ArmName;
}

function setChars(row: string, start: number, chars: string): string {
  let out = row;
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === "#") {
      out = out.slice(0, start + i) + "#" + out.slice(start + i + 1);
    }
  }
  return out;
}

/** Build the 16 rows of a frame from its parts. Never mutates GHOST_GRID. */
export function buildFrame(parts: FrameParts = {}): string[] {
  const rows = [...GHOST_GRID];
  const eyes: RowPatch = EYES[parts.eyes ?? "open"];
  const mouth: RowPatch = MOUTHS[parts.mouth ?? "smile"];
  for (const patch of [eyes, mouth]) {
    for (const key of Object.keys(patch)) {
      rows[Number(key)] = patch[Number(key)];
    }
  }
  const right: ArmShape = ARMS[parts.rightArm ?? "none"];
  for (const key of Object.keys(right)) {
    const y = Number(key);
    rows[y] = setChars(rows[y], 14, right[y]);
  }
  const left: ArmShape = ARMS[parts.leftArm ?? "none"];
  for (const key of Object.keys(left)) {
    const y = Number(key);
    const mirrored = left[y].split("").reverse().join("");
    rows[y] = setChars(rows[y], 0, mirrored);
  }
  return rows;
}

/** Turn rows into filled cells. `yOffset` shifts rows (the nightcap starts at -3). */
export function frameCells(rows: readonly string[], yOffset = 0): Cell[] {
  const cells: Cell[] = [];
  rows.forEach((row, i) => {
    for (let x = 0; x < row.length && x < GHOST_SIZE_CELLS; x++) {
      if (row[x] === "#") cells.push({ x, y: i + yOffset });
    }
  });
  return cells;
}

// ---- Nightcap (rows -3 to -1) ----
export const NIGHTCAP_ROWS: readonly string[] = [
  ".##.............",
  ".####...........",
  "..#########.....",
];
export const NIGHTCAP_CELLS: readonly Cell[] = frameCells(NIGHTCAP_ROWS, -3);

// ---- Sleep "z" ----
export const SLEEP_Z_CELLS: readonly Cell[] = [
  { x: 13, y: 0 },
  { x: 14, y: 0 },
  { x: 15, y: 0 },
  { x: 14, y: 1 },
  { x: 14, y: 2 },
  { x: 15, y: 2 },
];

export interface MoodFrames {
  /** Frame A rows. Always drawn. */
  readonly a: readonly string[];
  /** Frame B rows. Only drawn when animation is allowed. */
  readonly b?: readonly string[];
  /** Draw the sleep "z" cells with frame A. */
  readonly zA?: boolean;
  /** Draw the sleep "z" cells with frame B. */
  readonly zB?: boolean;
  /** How long a Busy_Mood lasts, in ms. 0 for resting moods. */
  readonly ms: number;
}

export const MOODS: Readonly<Record<GhostMood, MoodFrames>> = {
  idle: { a: buildFrame(), ms: 0 },
  wave: {
    a: buildFrame({ rightArm: "up" }),
    b: buildFrame({ rightArm: "upLean" }),
    ms: 1600,
  },
  cheer: {
    a: buildFrame({ eyes: "happy", mouth: "grin", leftArm: "up", rightArm: "up" }),
    b: buildFrame({
      eyes: "happy",
      mouth: "grin",
      leftArm: "outHigh",
      rightArm: "outHigh",
    }),
    ms: 1600,
  },
  think: {
    a: buildFrame({ mouth: "smallO", rightArm: "side" }),
    b: buildFrame({ eyes: "closed", mouth: "smallO", rightArm: "side" }),
    ms: 2000,
  },
  spin: {
    a: buildFrame({ eyes: "happy" }),
    ms: 900,
  },
  sorry: {
    a: buildFrame({ mouth: "frown", leftArm: "down", rightArm: "down" }),
    b: buildFrame({
      eyes: "closed",
      mouth: "frown",
      leftArm: "down",
      rightArm: "down",
    }),
    ms: 2000,
  },
  point: {
    a: buildFrame({ rightArm: "outHigh" }),
    b: buildFrame({ rightArm: "outLow" }),
    ms: 1800,
  },
  sleep: {
    a: buildFrame({ eyes: "closed", mouth: "smallO" }),
    b: buildFrame({ eyes: "closed", mouth: "smallO" }),
    zA: true,
    ms: 0,
  },
  giggle: {
    a: buildFrame({ eyes: "happy", mouth: "grin" }),
    b: buildFrame({ eyes: "happy" }),
    ms: 1000,
  },
};
