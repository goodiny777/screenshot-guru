import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./ui/App";
import { installAgentApi } from "./agent/api";
import { loadSaved } from "./store/store";
import { registerFont } from "./store/assets";
import { markCustomFont } from "./model/fonts";
import { getState } from "./store/store";

installAgentApi();
void loadSaved().then(async () => {
  for (const [family, id] of Object.entries(getState().project.fonts ?? {})) {
    markCustomFont(family);
    await registerFont(family, id);
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
