import SwiftUI

@Observable
@MainActor
final class HomeModel {
    enum State { case loading, failed, loaded }
    var state: State = .loading
    var week: [PracticeDays.WeekDay] = []
    var streak = 0
    var stats = ProgressStats()
    var today = PracticeDays.toDayKey(Date())

    func load() async {
        let today = PracticeDays.toDayKey(Date())
        self.today = today
        do {
            async let history = StatsRepo.practiceHistory()
            async let stats = StatsRepo.progressStats(weekStart: PracticeDays.startOfWeek(today))
            let (h, s) = try await (history, stats)
            week = PracticeDays.buildWeek(h, today: today)
            streak = PracticeDays.currentStreak(h, today: today)
            self.stats = s
            state = .loaded
        } catch {
            print("Home load failed: \(error)")
            if state != .loaded { state = .failed }
        }
    }
}

struct HomeView: View {
    @Environment(SessionStore.self) private var session
    @State private var model = HomeModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                switch model.state {
                case .loading:
                    RoundedRectangle(cornerRadius: Radius.xl).fill(Color.appMuted).frame(height: 176)
                    RoundedRectangle(cornerRadius: Radius.xl).fill(Color.appMuted).frame(height: 160)
                case .failed:
                    Text("Couldn't load your progress just now. Pull down to refresh, or try again in a moment.")
                        .font(.app(14)).foregroundStyle(Color.appMutedForeground)
                        .frame(maxWidth: .infinity, alignment: .leading)
                case .loaded:
                    ActivityWeekCard(week: model.week, streak: model.streak, today: model.today)
                    StatCarousel(stats: model.stats)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 24)
            .frame(maxWidth: 448)
            .frame(maxWidth: .infinity)
        }
        .refreshable { await model.load() }
        .pageBackground()
        .appHeader {
            Button { Task { await session.signOut() } } label: { Image(systemName: "rectangle.portrait.and.arrow.right") }
                .buttonStyle(RoundIconButtonStyle())
                .accessibilityLabel("Sign out")
        }
        .task { await model.load() }
    }
}

// MARK: - Activity week (components/home/activity-week.tsx)

struct ActivityWeekCard: View {
    let week: [PracticeDays.WeekDay]
    let streak: Int
    let today: DayKey

    private let zhDays = ["一", "二", "三", "四", "五", "六", "日"]
    private let enDays = ["M", "T", "W", "T", "F", "S", "S"]

    private var practisedCount: Int { week.filter { !$0.activities.isEmpty }.count }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Text("本週").font(.app(16, weight: .medium)).zh()
                    Text("This week").font(.app(16)).foregroundStyle(Color.appMutedForeground)
                }
                Spacer()
                if streak > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "flame.fill").font(.system(size: 12))
                        Text("\(streak)天")
                    }
                    .font(.app(12, weight: .medium))
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(Color.appAccent, in: Capsule())
                    .accessibilityLabel("\(streak) day\(streak == 1 ? "" : "s") in a row")
                }
            }
            .padding(.horizontal, 16)

            HStack {
                ForEach(Array(week.enumerated()), id: \.element.id) { i, day in
                    let isToday = day.date == today
                    VStack(spacing: 6) {
                        VStack(spacing: 0) {
                            Text(zhDays[i]).font(.app(14, weight: isToday ? .medium : .regular))
                                .foregroundStyle(isToday ? Color.appForeground : Color.appMutedForeground)
                            Text(enDays[i]).font(.app(10))
                                .foregroundStyle(isToday ? Color.appMutedForeground : Color.appMutedForeground.opacity(0.7))
                        }
                        dayCircle(day, isToday: isToday)
                    }
                    if i < week.count - 1 { Spacer(minLength: 0) }
                }
            }
            .padding(.horizontal, 16)

            Text("本週練習咗 \(practisedCount) 日 · \(practisedCount) day\(practisedCount == 1 ? "" : "s") practised")
                .font(.app(14)).foregroundStyle(Color.appMutedForeground)
                .padding(.horizontal, 16)
        }
        .padding(.vertical, 16)
        .background(Color.appCard, in: RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).stroke(Color.appForeground.opacity(0.1), lineWidth: 1))
    }

    @ViewBuilder
    private func dayCircle(_ day: PracticeDays.WeekDay, isToday: Bool) -> some View {
        let done = !day.activities.isEmpty
        let missed = !done && day.date < today
        let upcoming = !done && day.date > today
        ZStack {
            Circle().fill(done ? Color.deckMint : (missed ? Color.appMuted : Color.appCard))
            if upcoming {
                Circle().stroke(style: StrokeStyle(lineWidth: 1, dash: [3, 3])).foregroundStyle(Color.appBorder)
            }
            if done {
                Image(systemName: "checkmark").font(.system(size: 16, weight: .semibold)).foregroundStyle(Color.appForeground)
            }
        }
        .frame(width: 40, height: 40)
        .overlay {
            if isToday { Circle().stroke(Color.appRing, lineWidth: 2).padding(-4) }
        }
        .accessibilityLabel(label(day, isToday: isToday, done: done, missed: missed))
    }

    private func label(_ day: PracticeDays.WeekDay, isToday: Bool, done: Bool, missed: Bool) -> String {
        let names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        let idx = week.firstIndex(where: { $0.id == day.id }) ?? 0
        var s = names[idx] + (isToday ? ", today" : "")
        if done {
            let acts = day.activities.map { k -> String in
                switch k { case .review: "a deck review"; case .chat: "a chat"; case .read: "a reading session" }
            }
            s += ": practised — " + acts.joined(separator: ", ")
        } else if isToday { s += ": no practice yet" } else if missed { s += ": no practice" } else { s += ": upcoming" }
        return s
    }
}

// MARK: - Stat carousel (components/home/stat-carousel.tsx)

struct StatCarousel: View {
    let stats: ProgressStats
    @State private var page = 0

    private struct Slide: Identifiable { let id: Int; let color: Color; let value: Int; let zh: String; let en: String; let caption: String }

    private var slides: [Slide] {[
        Slide(id: 0, color: .deckMint, value: stats.wordsReviewedThisWeek, zh: "本週複習詞語", en: "Words reviewed", caption: "This week, Monday to Sunday"),
        Slide(id: 1, color: .deckSky, value: stats.conversations, zh: "對話次數", en: "Conversations", caption: "With your AI tutor"),
        Slide(id: 2, color: .deckBlush, value: stats.linesRead, zh: "已讀句子", en: "Lines read", caption: "Across your articles"),
    ]}

    var body: some View {
        VStack(spacing: 8) {
            TabView(selection: $page) {
                ForEach(slides) { s in
                    VStack(alignment: .leading) {
                        Text(s.value.formatted())
                            .font(.system(size: 48, weight: .semibold)).monospacedDigit()
                        Spacer()
                        Text(s.zh).font(.app(16, weight: .medium)).zh()
                        Text(s.en).font(.app(14)).foregroundStyle(Color.appMutedForeground)
                        Text(s.caption).font(.app(12)).foregroundStyle(Color.appMutedForeground).padding(.top, 4)
                    }
                    .padding(20)
                    .frame(maxWidth: .infinity, minHeight: 160, alignment: .leading)
                    .background(s.color, in: RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
                    .tag(s.id)
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("\(s.id + 1) of 3: \(s.en), \(s.value)")
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(height: 176)

            HStack(spacing: 0) {
                ForEach(slides) { s in
                    Button { withAnimation { page = s.id } } label: {
                        Circle().fill(page == s.id ? Color.appForeground : Color.appForeground.opacity(0.25))
                            .frame(width: 8, height: 8)
                            .frame(width: 44, height: 28)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Go to slide \(s.id + 1)")
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Your progress")
    }
}
