import Foundation
import Observation

/// URLs shared into the app from the Share Extension, waiting to become reads.
/// `MainTabView` watches `pending` and opens the new-read form for it.
@Observable
@MainActor
final class SharedReadInbox {
    var pending: URL?

    /// Pull anything the extension queued. The newest wins if several were shared.
    func refresh() {
        if let last = SharedReadQueue.drain().last { pending = last }
    }

    /// Handle an incoming URL; returns false if it isn't an add-read deep link.
    func handle(_ url: URL) -> Bool {
        guard let shared = SharedReadQueue.sharedURL(from: url) else { return false }
        SharedReadQueue.enqueue(shared)
        refresh()
        return true
    }
}
