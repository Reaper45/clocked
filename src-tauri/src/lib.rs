use tauri::{Manager, Monitor, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

/// Called by the frontend on any real input. A screen saver just exits; the OS takes it from
/// there (Windows shows the logon screen if "On resume, display logon screen" is on).
#[tauri::command]
fn dismiss(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Windows passes /s to run the saver, /c for settings and /p <hwnd> for the preview.
    // Other platforms don't launch it this way (macOS uses the native .saver in saver/),
    // so there it shows straight away, which is what `tauri dev` needs.
    #[cfg(windows)]
    {
        let arg = std::env::args().nth(1).unwrap_or_default().to_lowercase();
        // `tauri dev` starts debug builds with no arguments, so show the saver then too
        let dev_launch = cfg!(debug_assertions) && arg.is_empty();
        if !arg.starts_with("/s") && !dev_launch {
            return; // /c, /p (the preview stays blank), none → nothing to do
        }
    }

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![dismiss])
        .setup(|app| {
            create_saver_windows(app)?;
            show_saver(app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// One window per monitor: "main" (from tauri.conf.json) on the primary, "saver-{i}" on the rest
fn create_saver_windows(app: &tauri::App) -> tauri::Result<()> {
    let monitors = app.available_monitors()?;
    let primary = app.primary_monitor()?;
    let main_idx = primary
        .and_then(|p| monitors.iter().position(|m| m.position() == p.position()))
        .unwrap_or(0);

    for (i, monitor) in monitors.iter().enumerate() {
        let window = if i == main_idx {
            match app.get_webview_window("main") {
                Some(w) => w,
                None => continue,
            }
        } else {
            WebviewWindowBuilder::new(app, format!("saver-{i}"), WebviewUrl::default())
                .title("clocked")
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .resizable(false)
                .visible(false)
                .theme(Some(tauri::Theme::Dark))
                .build()?
        };
        cover_monitor(&window, monitor)?;
    }
    Ok(())
}

fn cover_monitor(window: &WebviewWindow, monitor: &Monitor) -> tauri::Result<()> {
    window.set_position(*monitor.position())?;
    window.set_size(*monitor.size())?;
    window.set_fullscreen(true)
}

fn show_saver(app: &tauri::AppHandle) {
    for window in app.webview_windows().values() {
        let _ = window.show();
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.set_focus();
    }
}
