import SwiftUI
import Supabase

@main
struct CantoneseLearnerApp: App {
    @State private var session = SessionStore()
    @State private var sharedReads = SharedReadInbox()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(sharedReads)
                .task { await session.start() }
                .onOpenURL { url in
                    // cantonese://add-read?url=… comes from the Share Extension;
                    // everything else is a Supabase auth callback.
                    if sharedReads.handle(url) { return }
                    Task { await session.handle(url: url) }
                }
        }
    }
}
