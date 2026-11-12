import { defaultWindowIcon } from "@tauri-apps/api/app";
import { Menu } from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";
import { exit } from "@tauri-apps/plugin-process";

const TRAY_ID = "main";

export async function setupTray() {
  // The tray outlives a webview reload, so reuse it instead of adding a second icon
  if (await TrayIcon.getById(TRAY_ID)) return;

  const menu = await Menu.new({
    items: [{ id: "quit", text: "Quit", action: () => exit(0) }],
  });

  await TrayIcon.new({
    id: TRAY_ID,
    icon: (await defaultWindowIcon()) ?? undefined,
    tooltip: "Clocked",
    menu,
    showMenuOnLeftClick: true,
  });
}
