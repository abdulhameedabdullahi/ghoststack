import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { GhostProvider } from "./components/ghost/GhostProvider";
import "./components/theme.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GhostProvider initialMidnight={document.documentElement.dataset.theme === "midnight"}>
      <App />
    </GhostProvider>
  </StrictMode>,
);
