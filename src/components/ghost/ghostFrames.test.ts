import { describe, expect, it } from "vitest";
import { GHOST_GRID } from "../ghostGrid";
import {
  ARMS,
  EYES,
  MOODS,
  MOUTHS,
  NIGHTCAP_CELLS,
  NIGHTCAP_ROWS,
  SLEEP_Z_CELLS,
  buildFrame,
  frameCells,
  type ArmName,
  type EyesName,
  type MouthName,
} from "./ghostFrames";

function changedRows(rows: readonly string[]): number[] {
  return rows.map((r, i) => (r !== GHOST_GRID[i] ? i : -1)).filter((i) => i >= 0);
}

function changedColumns(rows: readonly string[]): Set<number> {
  const cols = new Set<number>();
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) if (r[x] !== GHOST_GRID[y][x]) cols.add(x);
  });
  return cols;
}

describe("ghostFrames", () => {
  it("every row of every mood frame is 16 characters, with 16 rows", () => {
    for (const mood of Object.values(MOODS)) {
      for (const frame of [mood.a, mood.b]) {
        if (!frame) continue;
        expect(frame).toHaveLength(16);
        for (const row of frame) expect(row).toHaveLength(16);
      }
    }
  });

  it("every eye, mouth and arm variant builds 16-character rows", () => {
    for (const eyes of Object.keys(EYES) as EyesName[]) {
      for (const row of buildFrame({ eyes })) expect(row).toHaveLength(16);
    }
    for (const mouth of Object.keys(MOUTHS) as MouthName[]) {
      for (const row of buildFrame({ mouth })) expect(row).toHaveLength(16);
    }
    for (const arm of Object.keys(ARMS) as ArmName[]) {
      for (const row of buildFrame({ rightArm: arm, leftArm: arm })) {
        expect(row).toHaveLength(16);
      }
    }
  });

  it("eyes change only rows 4 to 6", () => {
    for (const eyes of Object.keys(EYES) as EyesName[]) {
      for (const y of changedRows(buildFrame({ eyes }))) {
        expect(y).toBeGreaterThanOrEqual(4);
        expect(y).toBeLessThanOrEqual(6);
      }
    }
  });

  it("mouths change only rows 9 to 10", () => {
    for (const mouth of Object.keys(MOUTHS) as MouthName[]) {
      for (const y of changedRows(buildFrame({ mouth }))) {
        expect(y).toBeGreaterThanOrEqual(9);
        expect(y).toBeLessThanOrEqual(10);
      }
    }
  });

  it("arms change only columns 0, 1, 14 and 15", () => {
    for (const arm of Object.keys(ARMS) as ArmName[]) {
      for (const x of changedColumns(buildFrame({ rightArm: arm, leftArm: arm }))) {
        expect([0, 1, 14, 15]).toContain(x);
      }
    }
  });

  it("every mood has a frame A", () => {
    for (const mood of Object.values(MOODS)) {
      expect(mood.a).toBeDefined();
      expect(mood.a).toHaveLength(16);
    }
  });

  it("idle frame A equals GHOST_GRID and buildFrame does not mutate it", () => {
    expect(MOODS.idle.a).toEqual([...GHOST_GRID]);
    buildFrame({ eyes: "closed", mouth: "frown", rightArm: "up", leftArm: "up" });
    expect(MOODS.idle.a).toEqual([...GHOST_GRID]);
  });

  it("nightcap rows are 16 characters", () => {
    expect(NIGHTCAP_ROWS).toHaveLength(3);
    for (const row of NIGHTCAP_ROWS) expect(row).toHaveLength(16);
  });

  it("every cell is inside x 0-15 and y -3 to 15", () => {
    const cells = [...NIGHTCAP_CELLS, ...SLEEP_Z_CELLS];
    for (const mood of Object.values(MOODS)) {
      cells.push(...frameCells(mood.a));
      if (mood.b) cells.push(...frameCells(mood.b));
    }
    expect(cells.length).toBeGreaterThan(0);
    for (const { x, y } of cells) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(15);
      expect(y).toBeGreaterThanOrEqual(-3);
      expect(y).toBeLessThanOrEqual(15);
    }
  });
});
