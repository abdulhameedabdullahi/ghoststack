/** 16 rows of 16 characters. "#" is a filled cell, "." is empty. */
export const GHOST_GRID: readonly string[] = [
  ".....######.....",
  "...##########...",
  "..############..",
  "..############..",
  "..##..####..##..",
  "..##..####..##..",
  "..##..####..##..",
  "..############..",
  "..############..",
  "..####....####..",
  "..############..",
  "..############..",
  "..############..",
  "..############..",
  "..###..##..###..",
  "..#...####...#..",
];

export const GHOST_SIZE_CELLS = 16;

/** The filled cells as {x, y} pairs, row by row. */
export function ghostCells(): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  GHOST_GRID.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === "#") cells.push({ x, y });
    }
  });
  return cells;
}
