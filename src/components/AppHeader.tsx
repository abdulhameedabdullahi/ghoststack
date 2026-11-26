import "./AppHeader.css";
import { Ghost } from "./Ghost";

/** App title bar. Takes no props and no children. */
export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header__title">
        <Ghost size={48} />
        <h1 className="app-header__name">GhostStack</h1>
      </div>
    </header>
  );
}
