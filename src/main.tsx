import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "kizkatt-ui/styles.css";
import "./styles.css";

import { installPageIcon } from "./browser/installPageIcon";
import { App } from "./components/App";

installPageIcon();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
