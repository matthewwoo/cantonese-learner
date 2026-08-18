import SwiftUI
import Supabase

@main
struct CantoneseLearnerApp: App {
    @State private var session = SessionStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .task { await session.start() }
                .onOpenURL { url in
                    Task { await session.handle(url: url) }
                }
        }
    }
}
