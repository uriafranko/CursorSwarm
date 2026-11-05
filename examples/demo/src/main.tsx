import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";

import "./styles.css";

const container = document.querySelector("#root");
if (!container) {
  throw new Error("index.html is missing #root");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
