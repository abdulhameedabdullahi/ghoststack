import type { CSSProperties } from "react";
import { GHOST_SIZE_CELLS } from "../ghostGrid";
import { useReducedMotion } from "../useReducedMotion";
import {
  MOODS,
  NIGHTCAP_CELLS,
  SLEEP_Z_CELLS,
  frameCells,
  type Cell,
} from "./ghostFrames";
import type { GhostMood } from "./ghostTypes";
import "./GhostMascot.css";

export interface GhostMascotProps {
  mood: GhostMood;
  nightcap: boolean;
  /** Pixel size of one grid cell. Default 3. */
  cell?: number;
}

function Rects({ cells }: { cells: readonly Cell[] }) {
  return (
    <>
      {cells.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
      ))}
    </>
  );
}

export function GhostMascot({ mood, nightcap, cell = 3 }: GhostMascotProps) {
  const reduced = useReducedMotion();
  const animated = !reduced && mood !== "idle";
  const frames = MOODS[mood];

  const cellsA: Cell[] = frameCells(frames.a);
  if (frames.zA) cellsA.push(...SLEEP_Z_CELLS);

  let cellsB: Cell[] | null = null;
  if (animated && frames.b) {
    cellsB = frameCells(frames.b);
    if (frames.zB) cellsB.push(...SLEEP_Z_CELLS);
  }

  const className = `ghost-mascot${
    animated ? ` ghost-mascot--anim ghost-mascot--anim-${mood}` : ""
  }`;
  const style = { "--ghost-cell": `${cell}px` } as CSSProperties;

  return (
    <span className={className} data-mood={mood} style={style}>
      <svg
        viewBox={`0 -3 ${GHOST_SIZE_CELLS} ${GHOST_SIZE_CELLS + 3}`}
        aria-hidden="true"
        focusable="false"
        shapeRendering="crispEdges"
        fill="currentColor"
      >
        <g className="ghost-mascot__frame ghost-mascot__frame--a">
          <Rects cells={cellsA} />
        </g>
        {cellsB && (
          <g className="ghost-mascot__frame ghost-mascot__frame--b">
            <Rects cells={cellsB} />
          </g>
        )}
        {nightcap && (
          <g className="ghost-mascot__cap">
            <Rects cells={NIGHTCAP_CELLS} />
          </g>
        )}
      </svg>
    </span>
  );
}
