import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./graphic-editor/styles.css";
import "./styles.css";

import { installCompatibilityPatches } from "./browser/installCompatibilityPatches";
import { App } from "./App";

installCompatibilityPatches();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
