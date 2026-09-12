import Foundation

/// Hand-off between the Share Extension and the app. The extension can't talk
/// to Supabase (no session), so it queues the shared URL in the App Group and
/// deep-links into the app, which drains the queue and opens the new-read form
/// with the URL prefilled. If the deep link doesn't fire (extension host quirks),
/// the queue is drained the next time the app becomes active.
enum SharedReadQueue {
    static let appGroup = "group.com.matthewwoo.CantoneseLearner"
    static let scheme = "cantonese"
    static let host = "add-read"
    private static let key = "pendingSharedReadURLs"

    private static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    static func enqueue(_ url: URL) {
        var list = defaults?.stringArray(forKey: key) ?? []
        if !list.contains(url.absoluteString) { list.append(url.absoluteString) }
        defaults?.set(list, forKey: key)
    }

    /// Removes and returns everything queued, oldest first.
    static func drain() -> [URL] {
        let list = defaults?.stringArray(forKey: key) ?? []
        defaults?.removeObject(forKey: key)
        return list.compactMap(URL.init(string:))
    }

    /// `cantonese://add-read?url=…` — what the extension opens to bring the app forward.
    static func deepLink(for url: URL) -> URL? {
        var c = URLComponents()
        c.scheme = scheme
        c.host = host
        c.queryItems = [URLQueryItem(name: "url", value: url.absoluteString)]
        return c.url
    }

    /// The shared article URL inside an `add-read` deep link, or nil for other URLs.
    static func sharedURL(from deepLink: URL) -> URL? {
        guard deepLink.scheme == scheme, deepLink.host == host,
              let value = URLComponents(url: deepLink, resolvingAgainstBaseURL: false)?
                  .queryItems?.first(where: { $0.name == "url" })?.value
        else { return nil }
        return URL(string: value)
    }
}
