import Foundation
import Observation
import Supabase

/// Observes Supabase auth state — the native equivalent of `useUser()`.
@Observable
@MainActor
final class SessionStore {
    enum State: Equatable {
        case loading
        case signedOut
        case signedIn(userID: UUID, email: String?)
    }

    private(set) var state: State = .loading

    var userID: UUID? {
        if case let .signedIn(id, _) = state { return id }
        return nil
    }

    var email: String? {
        if case let .signedIn(_, email) = state { return email }
        return nil
    }

    private var listening = false

    func start() async {
        guard !listening else { return }
        listening = true
        #if DEBUG
        // `--ui-preview` renders the signed-in shell without a session (for layout checks in the simulator).
        if ProcessInfo.processInfo.arguments.contains("--ui-preview") {
            state = .signedIn(userID: UUID(), email: "preview@example.com")
            return
        }
        #endif
        // Initial state
        if let session = try? await supabase.auth.session {
            state = .signedIn(userID: session.user.id, email: session.user.email)
        } else {
            state = .signedOut
        }
        // Follow changes
        for await (event, session) in supabase.auth.authStateChanges {
            switch event {
            case .initialSession, .signedIn, .tokenRefreshed, .userUpdated:
                if let session {
                    state = .signedIn(userID: session.user.id, email: session.user.email)
                } else if event == .initialSession {
                    state = .signedOut
                }
            case .signedOut, .userDeleted:
                state = .signedOut
            default:
                break
            }
        }
    }

    /// Handles `cantonese://auth/callback?...` deep links (email confirmation / magic link / OAuth).
    func handle(url: URL) async {
        do {
            try await supabase.auth.session(from: url)
        } catch {
            print("Auth callback failed: \(error)")
        }
    }

    /// Current access token for calling the Next.js API routes with `Authorization: Bearer`.
    func accessToken() async throws -> String {
        try await supabase.auth.session.accessToken
    }

    func signOut() async {
        try? await supabase.auth.signOut()
        state = .signedOut
    }
}
