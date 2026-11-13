import OSLog
import ScreenSaver
import WebKit

private let log = Logger(subsystem: "com.jo.clocked.saver", category: "saver")

/// macOS screen saver that shows the web clock (the Vite build, copied into Resources/web).
/// macOS handles everything else: idle time, the System Settings preview, dismissing and the password.
@objc(ClockedView)
final class ClockedView: ScreenSaverView, WKNavigationDelegate {
    private var webView: WKWebView?

    override init?(frame: NSRect, isPreview: Bool) {
        super.init(frame: frame, isPreview: isPreview)
        animationTimeInterval = 1 // The page animates itself with requestAnimationFrame
        log.info("init preview=\(isPreview) frame=\(NSStringFromRect(frame), privacy: .public)")

        // Since macOS 14 the saver host keeps instances alive after dismissing and can reuse them,
        // so the page is created on every start and dropped on every stop
        DistributedNotificationCenter.default().addObserver(
            self,
            selector: #selector(willStop),
            name: NSNotification.Name("com.apple.screensaver.willstop"),
            object: nil
        )
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
    }

    deinit {
        DistributedNotificationCenter.default().removeObserver(self)
    }

    override func startAnimation() {
        super.startAnimation()
        log.info("startAnimation preview=\(self.isPreview) hasPage=\(self.webView != nil)")
        if webView == nil { loadPage() }
    }

    override func stopAnimation() {
        super.stopAnimation()
        log.info("stopAnimation preview=\(self.isPreview)")
        unloadPage()
    }

    @objc private func willStop() {
        log.info("willstop preview=\(self.isPreview)")
        if !isPreview { unloadPage() }
    }

    private func loadPage() {
        let resources = Bundle(for: ClockedView.self).resourceURL!.appendingPathComponent("web")
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(root: resources), forURLScheme: "clocked")
        // The saver host draws its window from another process, so WebKit thinks the page is hidden,
        // pauses requestAnimationFrame and suspends the page: a blank screen. Keep it running.
        setPrivateBool(config.preferences, "_setPageVisibilityBasedProcessSuppressionEnabled:", false)
        setPrivateBool(config.preferences, "_setHiddenPageDOMTimerThrottlingEnabled:", false)

        let webView = WKWebView(frame: bounds, configuration: config)
        setPrivateBool(webView, "_setWindowOcclusionDetectionEnabled:", false)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        // The clock follows prefers-color-scheme; a screen saver should always be dark
        webView.appearance = NSAppearance(named: .darkAqua)
        // Let the black background below show until the page has loaded
        webView.setValue(false, forKey: "drawsBackground")
        webView.load(URLRequest(url: URL(string: "clocked://app/index.html")!))
        addSubview(webView)
        self.webView = webView
    }

    private func unloadPage() {
        webView?.removeFromSuperview()
        webView = nil
    }

    /// Calls a private WebKit setter taking a BOOL, only if this macOS version still has it
    private func setPrivateBool(_ object: NSObject, _ selectorName: String, _ value: Bool) {
        let selector = NSSelectorFromString(selectorName)
        guard object.responds(to: selector) else {
            log.error("\(selectorName, privacy: .public) is unavailable")
            return
        }
        typealias Setter = @convention(c) (NSObject, Selector, Bool) -> Void
        unsafeBitCast(object.method(for: selector), to: Setter.self)(object, selector, value)
    }

    // MARK: Diagnostics: `log stream --predicate 'subsystem == "com.jo.clocked.saver"'`

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        log.info("page loaded, window=\(self.window != nil) visible=\(self.window?.isVisible ?? false)")
        // The clock draws on requestAnimationFrame, which WebKit pauses if it thinks the view is hidden
        webView.callAsyncJavaScript(
            """
            const raf = await Promise.race([
              new Promise(r => requestAnimationFrame(() => r("running"))),
              new Promise(r => setTimeout(() => r("paused"), 2000)),
            ]);
            return `visibility=${document.visibilityState} animationFrames=${raf}`;
            """,
            in: nil, in: .page
        ) { result in
            switch result {
            case .success(let value): log.info("page state: \(String(describing: value), privacy: .public)")
            case .failure(let error): log.error("page state check failed: \(error, privacy: .public)")
            }
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        log.error("navigation failed: \(error, privacy: .public)")
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        log.error("navigation failed to start: \(error, privacy: .public)")
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        log.error("web content process terminated")
    }

    override func draw(_ rect: NSRect) {
        NSColor.black.setFill()
        rect.fill()
    }

    override var hasConfigureSheet: Bool { false }
    override var configureSheet: NSWindow? { nil }
}

/// Serves clocked://app/<path> from a folder, so the page's absolute /assets/... URLs resolve
private final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    private let root: URL

    init(root: URL) {
        self.root = root.standardizedFileURL
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        let path = url.path.isEmpty || url.path == "/" ? "/index.html" : url.path
        let file = root.appendingPathComponent(path).standardizedFileURL

        // Stay inside the web folder
        guard file.path.hasPrefix(root.path + "/"), let data = try? Data(contentsOf: file) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let response = URLResponse(
            url: url,
            mimeType: Self.mimeType(for: file.pathExtension),
            expectedContentLength: data.count,
            textEncodingName: nil
        )
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    private static func mimeType(for ext: String) -> String {
        switch ext {
        case "html": "text/html"
        case "js": "text/javascript"
        case "css": "text/css"
        case "svg": "image/svg+xml"
        case "png": "image/png"
        case "woff2": "font/woff2"
        default: "application/octet-stream"
        }
    }
}
