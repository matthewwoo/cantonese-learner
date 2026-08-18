import Foundation
import Supabase

/// Robust ISO-8601 parsing for PostgREST timestamps (`2026-08-17T10:00:00.123456+00:00`,
/// with or without fractional seconds / offsets).
enum ISO8601 {
    private static let fractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let plain: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()
    private static let noZone: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        return f
    }()

    static func parse(_ s: String) -> Date? {
        if let d = fractional.date(from: s) { return d }
        if let d = plain.date(from: s) { return d }
        // Postgres may emit >3 fractional digits without zone in rare cases; normalise.
        var trimmed = s
        if let dot = trimmed.firstIndex(of: "."), let plus = trimmed.lastIndex(where: { $0 == "+" || $0 == "Z" }), plus > dot {
            let frac = trimmed[trimmed.index(after: dot)..<plus].prefix(3)
            trimmed = String(trimmed[..<dot]) + "." + frac + String(trimmed[plus...])
            if let d = fractional.date(from: trimmed) { return d }
        }
        return noZone.date(from: s)
    }

    static func string(_ d: Date) -> String { fractional.string(from: d) }
}

private let supabaseDecoder: JSONDecoder = {
    let d = JSONDecoder()
    d.dateDecodingStrategy = .custom { decoder in
        let c = try decoder.singleValueContainer()
        let s = try c.decode(String.self)
        if let date = ISO8601.parse(s) { return date }
        throw DecodingError.dataCorruptedError(in: c, debugDescription: "Bad date: \(s)")
    }
    return d
}()

private let supabaseEncoder: JSONEncoder = {
    let e = JSONEncoder()
    e.dateEncodingStrategy = .custom { date, encoder in
        var c = encoder.singleValueContainer()
        try c.encode(ISO8601.string(date))
    }
    return e
}()

/// Single shared Supabase client (auth + PostgREST), mirroring `src/lib/supabase/client.ts`.
let supabase = SupabaseClient(
    supabaseURL: AppConfig.supabaseURL,
    supabaseKey: AppConfig.supabaseAnonKey,
    options: .init(
        db: .init(encoder: supabaseEncoder, decoder: supabaseDecoder),
        auth: .init(
            redirectToURL: URL(string: "cantonese://auth/callback"),
            flowType: .pkce
        )
    )
)
