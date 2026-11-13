import { invoke } from "@tauri-apps/api/core";

const MOVE_THRESHOLD = 10; // px; screen savers ignore smaller mouse jitter
const MOVE_GAP_MS = 1000; // A pause this long starts a new movement

// Any key, click or real mouse move asks Rust to dismiss the saver (exit on Windows, lock elsewhere)
export function setupDismiss() {
  let start: { x: number; y: number } | null = null;
  let lastMove = 0;

  const dismiss = () => {
    start = null;
    invoke("dismiss").catch((err) => console.error("Failed to dismiss:", err));
  };

  window.addEventListener("keydown", dismiss);
  window.addEventListener("pointerdown", dismiss);
  window.addEventListener("pointermove", (e) => {
    // Measure from where this movement began, not from a position left over from an earlier run
    if (e.timeStamp - lastMove > MOVE_GAP_MS) start = null;
    lastMove = e.timeStamp;
    start ??= { x: e.clientX, y: e.clientY };
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_THRESHOLD) dismiss();
  });
}
