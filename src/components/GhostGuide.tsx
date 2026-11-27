import { useEffect } from "react";
import { Ghost } from "./Ghost";
import { useGhost } from "./ghost/GhostProvider";
import "./GhostGuide.css";

export interface GhostGuideProps {
  hint: string;
}

export function GhostGuide({ hint }: GhostGuideProps) {
  const { react } = useGhost();
  useEffect(() => react("emptyScreen"), [react]);
  return (
    <div className="ghost-guide">
      <Ghost size={48} animate />
      <p className="ghost-guide__bubble">{hint}</p>
    </div>
  );
}
