import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "kizkatt-graphic-engine/styles.css";
import "./styles.css";

import { installCompatibilityPatches } from "./browser/installCompatibilityPatches";
import { App } from "./App";

installCompatibilityPatches();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
