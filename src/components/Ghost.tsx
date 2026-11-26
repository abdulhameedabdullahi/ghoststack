import "./Ghost.css";
import { GHOST_SIZE_CELLS, ghostCells } from "./ghostGrid";

export type GhostSize = 24 | 48 | 96;

export interface GhostProps {
  /** Pixel width and height. Default 48. */
  size?: GhostSize;
  /** When given, the ghost is an image with this accessible name. */
  title?: string;
  /** Opt in to the slow blink animation (disabled under prefers-reduced-motion). */
  animate?: boolean;
}

const CELLS = ghostCells();

export function Ghost({ size = 48, title, animate }: GhostProps) {
  const a11y =
    title === undefined
      ? ({ "aria-hidden": "true" } as const)
      : ({ role: "img" } as const);
  return (
    <svg
      className={`ghost${animate ? " ghost--blink" : ""}`}
      viewBox={`0 0 ${GHOST_SIZE_CELLS} ${GHOST_SIZE_CELLS}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      fill="currentColor"
      focusable="false"
      {...a11y}
    >
      {title !== undefined && <title>{title}</title>}
      {CELLS.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
      ))}
    </svg>
  );
}
