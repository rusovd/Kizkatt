import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./graphic-editor/styles.css";
import "./styles.css";

import { installCompatibilityPatches } from "./browser/installCompatibilityPatches";
import { installPageIcon } from "./browser/installPageIcon";
import { App } from "./App";

installCompatibilityPatches();
installPageIcon();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
