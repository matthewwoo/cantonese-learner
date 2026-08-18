import Foundation

/// Build-time configuration injected from `Config/Secrets.xcconfig` via Info.plist.
enum AppConfig {
    static let supabaseURL: URL = url(for: "SupabaseURL")
    static let supabaseAnonKey: String = string(for: "SupabaseAnonKey")
    /// Base URL of the deployed Next.js app whose `/api/*` routes proxy the OpenAI features.
    static let apiBaseURL: URL = url(for: "APIBaseURL")

    private static func string(for key: String) -> String {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String, !value.isEmpty else {
            fatalError("Missing \(key) in Info.plist — copy ios/Config/Secrets.example.xcconfig to Secrets.xcconfig and fill it in.")
        }
        return value
    }

    private static func url(for key: String) -> URL {
        guard let url = URL(string: string(for: key)) else {
            fatalError("Invalid URL for \(key) in Info.plist")
        }
        return url
    }
}
