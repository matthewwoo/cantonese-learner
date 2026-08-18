import Foundation

/// Port of `src/lib/activity/practice-days.ts` — all keys are LOCAL calendar days "YYYY-MM-DD".
enum PracticeDays {
    private static var cal: Calendar { Calendar.current }

    static func toDayKey(_ date: Date) -> DayKey {
        let c = cal.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

    private static func noon(_ key: DayKey) -> Date {
        let parts = key.split(separator: "-").compactMap { Int($0) }
        var c = DateComponents()
        c.year = parts[0]; c.month = parts[1]; c.day = parts[2]; c.hour = 12
        return cal.date(from: c) ?? Date()
    }

    /// Positive offset = earlier day.
    static func shiftDay(_ key: DayKey, _ offset: Int) -> DayKey {
        toDayKey(cal.date(byAdding: .day, value: -offset, to: noon(key))!)
    }

    /// Local Monday 00:00 of the week containing `key`.
    static func startOfWeek(_ key: DayKey) -> Date {
        let d = noon(key)
        let weekday = cal.component(.weekday, from: d) // 1 = Sunday ... 7 = Saturday
        let jsGetDay = weekday - 1                       // 0 = Sunday ... 6 = Saturday
        let back = (jsGetDay + 6) % 7
        let monday = cal.date(byAdding: .day, value: -back, to: d)!
        return cal.startOfDay(for: monday)
    }

    struct WeekDay: Identifiable, Equatable {
        let date: DayKey
        let activities: [PracticeKind]
        var id: DayKey { date }
    }

    /// Mon..Sun, oldest first.
    static func buildWeek(_ practice: PracticeMap, today: DayKey) -> [WeekDay] {
        let monday = toDayKey(startOfWeek(today))
        return (0..<7).map { i in
            let date = shiftDay(monday, -i)
            let kinds = practice[date] ?? []
            return WeekDay(date: date, activities: PracticeKind.allCases.filter { kinds.contains($0) })
        }
    }

    /// Consecutive practised days ending today; an empty today does not break the streak.
    static func currentStreak(_ practice: PracticeMap, today: DayKey) -> Int {
        var cursor = practice[today] != nil ? today : shiftDay(today, 1)
        var streak = 0
        while practice[cursor] != nil {
            streak += 1
            cursor = shiftDay(cursor, 1)
        }
        return streak
    }
}
