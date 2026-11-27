import { Ghost } from "./Ghost";
import "./GhostGuide.css";

export interface GhostGuideProps {
  hint: string;
}

export function GhostGuide({ hint }: GhostGuideProps) {
  return (
    <div className="ghost-guide">
      <Ghost size={48} animate />
      <p className="ghost-guide__bubble">{hint}</p>
    </div>
  );
}
