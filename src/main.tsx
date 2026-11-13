import React from "react";
import ReactDOM from "react-dom/client";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./index.css";
import App from "./App";
import { setupDismiss } from "./dismiss";
import { setupTray } from "./tray";

// The plain browser build stays a normal clock page
if (isTauri()) {
  document.documentElement.classList.add("saver");
  setupDismiss();
  // Every monitor gets a window, but only one tray icon
  if (getCurrentWindow().label === "main") {
    setupTray().catch((err) => console.error("Failed to set up tray:", err));
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
