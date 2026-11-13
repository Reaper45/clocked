import React from "react";
import ReactDOM from "react-dom/client";
import { isTauri } from "@tauri-apps/api/core";
import "./index.css";
import App from "./App";
import { setupDismiss } from "./dismiss";

// The plain browser build stays a normal clock page
if (isTauri()) {
  document.documentElement.classList.add("saver");
  setupDismiss();
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
