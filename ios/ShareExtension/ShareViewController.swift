import SwiftUI
import UIKit
import UniformTypeIdentifiers

/// Share-sheet entry point ("Cantonese" in Safari and other apps). Pulls the
/// first web URL out of the shared items, queues it for the app, and opens the
/// app so the new-read form appears with the URL prefilled.
final class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
        let host = UIHostingController(rootView: ShareSheetView(
            loadURL: { [weak self] in await self?.extractURL() },
            onAdd: { [weak self] url in self?.add(url) },
            onCancel: { [weak self] in self?.cancel() }
        ))
        host.view.backgroundColor = .clear
        addChild(host)
        view.addSubview(host.view)
        host.view.frame = view.bounds
        host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        host.didMove(toParent: self)
    }

    // MARK: Input

    private func extractURL() async -> URL? {
        let providers = (extensionContext?.inputItems as? [NSExtensionItem])?
            .flatMap { $0.attachments ?? [] } ?? []

        for p in providers where p.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            if let item = try? await p.loadItem(forTypeIdentifier: UTType.url.identifier),
               let url = Self.webURL(from: item) {
                return url
            }
        }
        // Some apps share a page as text containing the link.
        for p in providers where p.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
            if let item = try? await p.loadItem(forTypeIdentifier: UTType.plainText.identifier),
               let text = item as? String, let url = Self.firstWebURL(in: text) {
                return url
            }
        }
        return nil
    }

    private static func webURL(from item: NSSecureCoding) -> URL? {
        let url: URL?
        if let u = item as? URL { url = u }
        else if let data = item as? Data { url = URL(dataRepresentation: data, relativeTo: nil) }
        else if let s = item as? String { url = URL(string: s) }
        else { url = nil }
        guard let url, let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" else { return nil }
        return url
    }

    private static func firstWebURL(in text: String) -> URL? {
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) else { return nil }
        let range = NSRange(text.startIndex..., in: text)
        return detector.matches(in: text, range: range).lazy.compactMap { $0.url }.first { webURL(from: $0 as NSURL) != nil }
    }

    // MARK: Actions

    private func add(_ url: URL) {
        SharedReadQueue.enqueue(url)
        if let link = SharedReadQueue.deepLink(for: url) {
            openHostApp(link)
        }
        // Give the open request a beat before the extension is torn down.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        }
    }

    private func cancel() {
        extensionContext?.cancelRequest(withError: CocoaError(.userCancelled))
    }

    /// `UIApplication.open` is unavailable to extensions at compile time, so walk
    /// the responder chain to the hosting UIApplication and invoke the modern
    /// `openURL:options:completionHandler:` dynamically. (iOS 18 force-returns
    /// false for the deprecated `openURL:` selector, so that older trick is out.)
    private func openHostApp(_ url: URL) {
        // Some hosts honour this directly; harmless where they don't.
        extensionContext?.open(url, completionHandler: nil)

        let selector = NSSelectorFromString("openURL:options:completionHandler:")
        var responder: UIResponder? = self
        while let r = responder {
            if r is UIApplication, r.responds(to: selector) {
                typealias OpenFn = @convention(c) (AnyObject, Selector, NSURL, NSDictionary, Any?) -> Void
                let fn = unsafeBitCast(r.method(for: selector), to: OpenFn.self)
                fn(r, selector, url as NSURL, [:] as NSDictionary, nil)
                return
            }
            responder = r.next
        }
    }
}
