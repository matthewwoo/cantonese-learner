import SwiftUI

/// Sequential per-sentence TTS player (mirrors components/articles/article-audio-player.tsx).
@Observable
@MainActor
final class ArticlePlayer {
    var sentences: [SentencePair] = []
    var activeIndex: Int? = nil
    var isPlaying = false
    var isFetching = false
    var rate: Float = 1.0
    var currentTime: TimeInterval = 0
    var duration: TimeInterval = 0

    private var runToken = 0
    private var ticker: Task<Void, Never>?
    private let speech = SpeechService.shared
    var onError: ((String) -> Void)?

    func toggle() {
        if isPlaying { pause() } else { Task { await play(from: activeIndex ?? 0) } }
    }

    /// Tap on a bubble: play from it, or pause if it's the active one playing.
    func toggleBlock(_ index: Int) {
        if activeIndex == index && isPlaying { pause(); return }
        Task { await play(from: index) }
    }

    func pause() {
        speech.pause()
        isPlaying = false
    }

    func stop() {
        runToken += 1
        ticker?.cancel()
        speech.stop()
        isPlaying = false
        activeIndex = nil
        currentTime = 0
        duration = 0
    }

    func seek(to t: TimeInterval) {
        speech.seek(to: t)
        currentTime = t
    }

    func setRate(_ r: Float) {
        rate = r
        speech.setRate(r)
    }

    private func play(from index: Int) async {
        guard index < sentences.count else { return }
        // Resume within the same clip
        if activeIndex == index, !isPlaying, speech.duration > 0, speech.currentTime > 0, speech.currentTime < speech.duration {
            speech.resume()
            isPlaying = true
            return
        }
        runToken += 1
        let token = runToken
        speech.stop()
        var i = index
        startTicker()
        while i < sentences.count, token == runToken {
            activeIndex = i
            isFetching = true
            var data: Data?
            do {
                data = try await speech.audio(for: sentences[i].chinese)
                // Prefetch next
                if i + 1 < sentences.count {
                    let next = sentences[i + 1].chinese
                    Task { _ = try? await self.speech.audio(for: next) }
                }
            } catch {
                print("ArticlePlayer: TTS failed for sentence \(i): \(error)")
                onError?("Unable to synthesize audio for this block: \(error.localizedDescription)")
            }
            isFetching = false
            guard token == runToken, let data else { break }
            isPlaying = true
            // Resolves when the clip finishes (a pause keeps it pending until resumed) or is stopped.
            await speech.play(data: data, rate: rate)
            guard token == runToken else { return }
            i += 1
        }
        if token == runToken {
            isPlaying = false
            activeIndex = nil
            ticker?.cancel()
        }
    }

    private func startTicker() {
        ticker?.cancel()
        ticker = Task { [weak self] in
            while !Task.isCancelled {
                guard let self else { return }
                self.currentTime = self.speech.currentTime
                self.duration = self.speech.duration
                try? await Task.sleep(for: .milliseconds(200))
            }
        }
    }
}

struct ArticleReaderView: View {
    let articleID: UUID
    @Environment(SessionStore.self) private var session
    @Environment(ToastCenter.self) private var toasts
    @Environment(\.dismiss) private var dismiss

    @State private var article: ArticleDetail?
    @State private var reading: ReadingSession?
    @State private var sentences: [SentencePair] = []
    @State private var loading = true
    @State private var notFound = false
    @State private var player = ArticlePlayer()
    @State private var furthest = 0
    @State private var visible: Set<Int> = []
    @State private var progressTask: Task<Void, Never>?

    var body: some View {
        Group {
            if loading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if notFound {
                notReadyView(emoji: "📄", title: "Article Not Found", detail: nil)
            } else if let a = article, a.displayStatus != .ready {
                notReadyView(emoji: "📖", title: a.title,
                             detail: a.displayStatus == .pending ? nil : "We couldn't translate this article. Delete it from your list and try again.",
                             pending: a.displayStatus == .pending)
            } else if let a = article {
                readerBody(a)
            }
        }
        .pageBackground()
        .appHeader()
        .navigationBarBackButtonHidden()
        .toolbar { ToolbarItem(placement: .topBarLeading) { BackToRootButton() } }
        .task { await load() }
        .onDisappear {
            player.stop()
            progressTask?.cancel()
            Task { await saveProgress() }
        }
    }

    // MARK: Body

    private func readerBody(_ a: ArticleDetail) -> some View {
        VStack(spacing: 0) {
            sentenceList(a)
            ArticlePlayerBar(player: player)
        }
        .onAppear {
            player.sentences = sentences
            player.onError = { toasts.error($0) }
            progressTask = Task {
                while !Task.isCancelled {
                    try? await Task.sleep(for: .seconds(5))
                    await saveProgress()
                }
            }
        }
    }

    private func sentenceList(_ a: ArticleDetail) -> some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 8) {
                        Text(a.title).font(.app(24, weight: .semibold)).tracking(-0.48).lineLimit(1).zh()
                        Spacer(minLength: 4)
                        Text("To read").font(.app(10, weight: .medium))
                            .padding(.horizontal, 8).frame(height: 24)
                            .foregroundStyle(Color.appPrimaryForeground)
                            .background(Color.appPrimary, in: RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
                    }
                    .padding(.bottom, 8)
                    if let src = a.sourceURL, let url = URL(string: src) {
                        Link(destination: url) {
                            Text("\(url.host ?? "") - \(src)").font(.app(14)).foregroundStyle(Color.appMutedForeground).lineLimit(1)
                        }
                        .frame(height: 40)
                    }
                    Rectangle().fill(Color.appBorder).frame(height: 1)

                    LazyVStack(spacing: 16) {
                        ForEach(sentences) { s in
                            let active = player.activeIndex == s.index
                            ChatBubble(
                                message: ChatMessage(id: UUID(uuidString: String(format: "00000000-0000-0000-0000-%012d", s.index)) ?? UUID(),
                                                     role: .assistant, content: s.chinese, translation: s.english),
                                externalPlaying: active && player.isPlaying,
                                onTapOverride: { player.toggleBlock(s.index) }
                            )
                            .padding(.horizontal, active ? 8 : 0).padding(.vertical, active ? 4 : 0)
                            .background(active ? Color.appAccent.opacity(0.5) : .clear, in: RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).stroke(active ? Color.appPrimary.opacity(0.5) : .clear, lineWidth: 2))
                            .padding(.horizontal, active ? -8 : 0)
                            .animation(.easeInOut(duration: 0.3), value: active)
                            .id(s.index)
                            .onAppear { visible.insert(s.index); furthest = max(furthest, s.index + 1) }
                            .onDisappear { visible.remove(s.index) }
                        }
                    }
                    .padding(.vertical, 32)
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 24)
                .frame(maxWidth: 480).frame(maxWidth: .infinity)
            }
            .onChange(of: player.activeIndex) {
                if let i = player.activeIndex, !visible.contains(i) {
                    withAnimation { proxy.scrollTo(i, anchor: .center) }
                }
            }
        }
    }

    private func notReadyView(emoji: String, title: String, detail: String?, pending: Bool = false) -> some View {
        VStack(spacing: 16) {
            Text(emoji).font(.system(size: 60))
            Text(title).font(.app(24, weight: .bold)).multilineTextAlignment(.center)
            if pending { ShimmeringText(text: "Translating…", font: .app(16)) }
            if let detail { Text(detail).font(.app(14)).foregroundStyle(Color.appMutedForeground).multilineTextAlignment(.center) }
            Button { dismiss() } label: { Text("Back to Articles") }.buttonStyle(.app(.primary))
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: Data

    private func load() async {
        guard let uid = session.userID else { return }
        do {
            guard let (a, r) = try await ArticlesRepo.getWithSession(userID: uid, articleID: articleID) else {
                notFound = true; loading = false; return
            }
            article = a
            reading = r
            furthest = r.currentPosition
            sentences = SentenceProcessor.process(original: a.originalContent, translated: a.translatedContent)
            loading = false
        } catch {
            toasts.error("Unable to load article")
            dismiss()
        }
    }

    private func saveProgress() async {
        guard let r = reading, furthest > r.currentPosition else { return }
        try? await ArticlesRepo.updateProgress(sessionID: r.id, position: furthest)
    }
}

// MARK: - Player bar

struct ArticlePlayerBar: View {
    @Bindable var player: ArticlePlayer
    private let speeds: [Float] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

    var body: some View {
        HStack(spacing: 12) {
            Button { player.toggle() } label: {
                Group {
                    if player.isFetching { ProgressView().tint(Color.appPrimaryForeground).controlSize(.small) }
                    else { Image(systemName: player.isPlaying ? "pause.fill" : "play.fill") }
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color.appPrimaryForeground)
                .frame(width: 40, height: 40)
                .background(Color.appPrimary, in: Circle())
            }
            .accessibilityLabel(player.isPlaying ? "Pause reading" : "Read article aloud")

            Text(fmt(player.currentTime)).font(.app(12)).monospacedDigit().foregroundStyle(Color.appMutedForeground)
            Slider(value: Binding(get: { player.currentTime }, set: { player.seek(to: $0) }),
                   in: 0...max(player.duration, 0.01))
                .tint(Color.appPrimary)
            Text(fmt(player.duration)).font(.app(12)).monospacedDigit().foregroundStyle(Color.appMutedForeground)

            Menu {
                ForEach(speeds, id: \.self) { s in
                    Button {
                        player.setRate(s)
                    } label: {
                        if player.rate == s { Label(label(s), systemImage: "checkmark") } else { Text(label(s)) }
                    }
                }
            } label: {
                Image(systemName: "gearshape").font(.system(size: 16)).foregroundStyle(Color.appMutedForeground)
                    .frame(width: 32, height: 32)
            }
            .accessibilityLabel("Playback speed")
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
        .frame(maxWidth: 480).frame(maxWidth: .infinity)
        .background(.bar)
        .overlay(alignment: .top) { Rectangle().fill(Color.appBorder).frame(height: 1) }
    }

    private func fmt(_ t: TimeInterval) -> String {
        let s = Int(t.rounded()); return String(format: "%d:%02d", s / 60, s % 60)
    }
    private func label(_ s: Float) -> String { s == 1 ? "Normal" : "\(s.formatted())×" }
}

#Preview("Player bar") {
    VStack { Spacer(); ArticlePlayerBar(player: ArticlePlayer()) }
        .background(Color.appBackground)
}
