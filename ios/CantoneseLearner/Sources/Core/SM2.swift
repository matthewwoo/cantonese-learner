import Foundation

/// Line-for-line port of `src/lib/srs/sm2.ts`.
enum ResponseQuality: Int, CaseIterable, Sendable {
    case blackout = 0, incorrect = 1, hard = 2, good = 3, easy = 4
}

struct SpacedRepetitionData: Sendable {
    var easeFactor: Double
    var interval: Int       // days
    var repetitions: Int
    var nextReviewDate: Date
}

enum SM2 {
    static func createInitialReviewData(now: Date = Date()) -> SpacedRepetitionData {
        SpacedRepetitionData(easeFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: now)
    }

    static func calculateNextReview(_ current: SpacedRepetitionData, quality q: ResponseQuality, now: Date = Date()) -> SpacedRepetitionData {
        var easeFactor = current.easeFactor
        var interval = current.interval
        var repetitions = current.repetitions

        // q is 0..4 (NOT 0..5): (5 - q) is used verbatim.
        let d = Double(5 - q.rawValue)
        easeFactor = max(1.3, easeFactor + (0.1 - d * (0.08 + d * 0.02)))

        if q.rawValue < 3 {
            repetitions = 0
            interval = 1
        } else {
            repetitions += 1
            if repetitions == 1 {
                interval = 1
            } else if repetitions == 2 {
                interval = 6
            } else {
                // JS Math.round: half toward +inf. Positive values → half away from zero.
                interval = Int((Double(interval) * easeFactor).rounded(.toNearestOrAwayFromZero))
            }
        }

        // JS: setDate(getDate() + interval) — local calendar-day arithmetic, keeps time of day.
        let next = Calendar.current.date(byAdding: .day, value: interval, to: now) ?? now.addingTimeInterval(Double(interval) * 86400)
        return SpacedRepetitionData(easeFactor: easeFactor, interval: interval, repetitions: repetitions, nextReviewDate: next)
    }

    static func isCardDue(_ nextReviewDate: Date, now: Date = Date()) -> Bool {
        nextReviewDate <= now
    }

    static func intervalDescription(_ interval: Int) -> String {
        if interval == 0 { return "New card" }
        if interval == 1 { return "1 day" }
        if interval < 7 { return "\(interval) days" }
        if interval < 30 { let w = Int((Double(interval) / 7).rounded()); return "\(w) week\(w == 1 ? "" : "s")" }
        if interval < 365 { let m = Int((Double(interval) / 30).rounded()); return "\(m) month\(m == 1 ? "" : "s")" }
        let y = Int((Double(interval) / 365).rounded()); return "\(y) year\(y == 1 ? "" : "s")"
    }
}
