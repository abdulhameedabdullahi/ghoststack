import type { CSSProperties } from "react";
import "./SpookyBackground.css";
import { Ghost } from "./Ghost";
import type { GhostSize } from "./Ghost";

interface GhostSpec {
  size: GhostSize;
  x: string;
  y: string;
  delay: string;
  dur: string;
  opacity: number;
  anim: "float-a" | "float-b" | "float-c";
}

const GHOSTS: GhostSpec[] = [
  { size: 96, x: "3%",  y: "10%", delay: "0s",    dur: "14s", opacity: 0.07, anim: "float-a" },
  { size: 48, x: "91%", y: "8%",  delay: "3.5s",  dur: "10s", opacity: 0.09, anim: "float-b" },
  { size: 96, x: "80%", y: "50%", delay: "7s",    dur: "17s", opacity: 0.06, anim: "float-c" },
  { size: 48, x: "5%",  y: "65%", delay: "2s",    dur: "12s", opacity: 0.08, anim: "float-a" },
  { size: 24, x: "50%", y: "20%", delay: "5.5s",  dur: "9s",  opacity: 0.11, anim: "float-b" },
  { size: 96, x: "30%", y: "78%", delay: "9s",    dur: "19s", opacity: 0.05, anim: "float-c" },
  { size: 48, x: "62%", y: "2%",  delay: "1s",    dur: "11s", opacity: 0.08, anim: "float-a" },
  { size: 24, x: "93%", y: "55%", delay: "6s",    dur: "7s",  opacity: 0.12, anim: "float-b" },
];

interface WispSpec {
  x: string;
  y: string;
  delay: string;
  dur: string;
  color: string;
  size: number;
}

const WISPS: WispSpec[] = [
  { x: "18%", y: "30%", delay: "0s",   dur: "7s",  color: "rgba(130,80,255,0.55)",  size: 8 },
  { x: "72%", y: "18%", delay: "2.5s", dur: "9s",  color: "rgba(80,200,255,0.45)",  size: 6 },
  { x: "85%", y: "72%", delay: "4s",   dur: "8s",  color: "rgba(0,255,140,0.38)",   size: 5 },
  { x: "40%", y: "85%", delay: "1.5s", dur: "11s", color: "rgba(200,80,255,0.50)",  size: 7 },
  { x: "55%", y: "45%", delay: "6s",   dur: "6s",  color: "rgba(255,180,80,0.35)",  size: 5 },
];

export function SpookyBackground() {
  return (
    <div className="spooky-bg" aria-hidden="true">
      {/* Moon */}
      <div className="spooky-bg__moon" />

      {/* Will-o'-wisps */}
      {WISPS.map((w, i) => (
        <div
          key={`wisp-${i}`}
          className="spooky-bg__wisp"
          style={{
            "--sw-x": w.x,
            "--sw-y": w.y,
            "--sw-delay": w.delay,
            "--sw-dur": w.dur,
            "--sw-color": w.color,
            "--sw-size": `${w.size}px`,
          } as CSSProperties}
        />
      ))}

      {/* Floating ghosts */}
      {GHOSTS.map((g, i) => (
        <div
          key={`ghost-${i}`}
          className={`spooky-bg__ghost spooky-bg__ghost--${g.anim}`}
          style={{
            "--sg-x": g.x,
            "--sg-y": g.y,
            "--sg-delay": g.delay,
            "--sg-dur": g.dur,
            "--sg-opacity": g.opacity,
          } as CSSProperties}
        >
          <Ghost size={g.size} />
        </div>
      ))}

      {/* Cobwebs */}
      <div className="spooky-bg__cobweb spooky-bg__cobweb--tl" aria-hidden="true">
        <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" width="160" height="160">
          <g stroke="rgba(220,200,255,0.55)" strokeWidth="0.9" fill="none">
            <line x1="0" y1="0" x2="160" y2="0" />
            <line x1="0" y1="0" x2="0" y2="160" />
            <line x1="0" y1="0" x2="130" y2="28" />
            <line x1="0" y1="0" x2="98" y2="68" />
            <line x1="0" y1="0" x2="58" y2="104" />
            <line x1="0" y1="0" x2="18" y2="138" />
            <path d="M 25 0 Q 20 20 0 25" />
            <path d="M 62 0 Q 52 30 32 54 Q 14 68 0 66" />
            <path d="M 105 0 Q 90 44 65 78 Q 42 100 0 105" />
            <path d="M 148 0 Q 124 56 98 100 Q 64 134 0 148" />
          </g>
          <g fill="rgba(220,200,255,0.70)" stroke="rgba(220,200,255,0.55)" strokeWidth="0.8">
            <ellipse cx="76" cy="40" rx="5" ry="4" />
            <ellipse cx="76" cy="34" rx="3" ry="3" />
            <line x1="71" y1="38" x2="64" y2="33" />
            <line x1="71" y1="40" x2="63" y2="41" />
            <line x1="71" y1="42" x2="65" y2="47" />
            <line x1="81" y1="38" x2="88" y2="33" />
            <line x1="81" y1="40" x2="89" y2="41" />
            <line x1="81" y1="42" x2="87" y2="47" />
          </g>
        </svg>
      </div>

      <div className="spooky-bg__cobweb spooky-bg__cobweb--tr" aria-hidden="true">
        <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" width="160" height="160" style={{ transform: "scaleX(-1)" } as CSSProperties}>
          <g stroke="rgba(220,200,255,0.45)" strokeWidth="0.9" fill="none">
            <line x1="0" y1="0" x2="160" y2="0" />
            <line x1="0" y1="0" x2="0" y2="160" />
            <line x1="0" y1="0" x2="130" y2="28" />
            <line x1="0" y1="0" x2="98" y2="68" />
            <line x1="0" y1="0" x2="58" y2="104" />
            <line x1="0" y1="0" x2="18" y2="138" />
            <path d="M 25 0 Q 20 20 0 25" />
            <path d="M 62 0 Q 52 30 32 54 Q 14 68 0 66" />
            <path d="M 105 0 Q 90 44 65 78 Q 42 100 0 105" />
            <path d="M 148 0 Q 124 56 98 100 Q 64 134 0 148" />
          </g>
        </svg>
      </div>
    </div>
  );
}
