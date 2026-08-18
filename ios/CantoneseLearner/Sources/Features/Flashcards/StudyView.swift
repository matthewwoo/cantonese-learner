import SwiftUI

/// Mirrors /flashcards/study/[setId] + StudySession.tsx + QuestionCard.tsx.
struct StudyView: View {
    let setID: UUID
    @Environment(SessionStore.self) private var session
    @Environment(ToastCenter.self) private var toasts
    @Environment(\.dismiss) private var dismiss

    @State private var studySession: StartedStudySession?
    @State private var index = 0
    @State private var loading = true
    @State private var submitting = false
    @State private var feedback = ""

    var body: some View {
        Group {
            if loading {
                EmojiLoadingView(emoji: "📚", label: "Starting your lesson...")
            } else if let s = studySession, index < s.studyCards.count {
                let card = s.studyCards[index]
                ScrollView {
                    VStack(spacing: 20) {
                        QuestionCardView(card: card.flashcard, disabled: submitting) { quality, ms in
                            Task { await answer(card, quality: quality, ms: ms) }
                        }
                        .id(card.id)
                        Text("\(index + 1) of \(s.studyCards.count)")
                            .font(.app(16, weight: .medium)).foregroundStyle(Color.appMutedForeground)
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity)
                }
                .accessibilityElement(children: .contain)
                .overlay { Text(feedback).accessibilityHidden(feedback.isEmpty).opacity(0).accessibilityLabel(feedback) }
            } else {
                Color.clear
            }
        }
        .pageBackground()
        .appHeader()
        .navigationBarBackButtonHidden()
        .toolbar { ToolbarItem(placement: .topBarLeading) { BackToRootButton() } }
        .task { await start() }
        .onDisappear { SpeechService.shared.stop() }
    }

    private func start() async {
        guard let uid = session.userID else { return }
        do {
            studySession = try await StudyRepo.startSession(userID: uid, setID: setID, maxCards: 15)
            loading = false
        } catch {
            toasts.error(error.localizedDescription)
            dismiss()
        }
    }

    private func answer(_ card: StudyCardWithFlashcard, quality: ResponseQuality, ms: Int) async {
        guard let s = studySession, !submitting else { return }
        submitting = true
        defer { submitting = false }
        SpeechService.shared.stop()
        do {
            _ = try await StudyRepo.recordResponse(studyCardID: card.id, quality: quality, responseTimeMs: ms)
            switch quality {
            case .easy: feedback = "Perfect! 完美! That was easy!"
            case .good: feedback = "Good job! 好! You got it right!"
            case .hard: feedback = "Correct but difficult. Keep practicing!"
            case .incorrect: feedback = "Not quite right. You'll get it next time!"
            case .blackout: feedback = "No worries! Learning takes time."
            }
            if index + 1 < s.studyCards.count {
                withAnimation(.easeInOut(duration: 0.25)) { index += 1 }
            } else {
                // Web app returns to the deck list immediately after the last card.
                dismiss()
            }
        } catch {
            toasts.error("Failed to record response")
        }
    }
}

// MARK: - Question card (QuestionCard.tsx)

struct QuestionCardView: View {
    let card: Flashcard
    let disabled: Bool
    let onRate: (ResponseQuality, Int) -> Void

    @State private var flipped = false
    @State private var shownAt = Date()
    private var speech: SpeechService { SpeechService.shared }

    var body: some View {
        ZStack {
            front
                .opacity(flipped ? 0 : 1)
                .rotation3DEffect(.degrees(flipped ? 180 : 0), axis: (0, 1, 0), perspective: 0.6)
            back
                .opacity(flipped ? 1 : 0)
                .rotation3DEffect(.degrees(flipped ? 0 : -180), axis: (0, 1, 0), perspective: 0.6)
        }
        .frame(maxWidth: 384)
        .frame(height: 574)
        .animation(.easeInOut(duration: 0.6), value: flipped)
        .onAppear { shownAt = Date() }
    }

    private var front: some View {
        VStack(spacing: 24) {
            Spacer()
            Text(card.chineseWord)
                .font(.system(size: 48, weight: .bold)).tracking(-0.96)
                .multilineTextAlignment(.center).zh()
            VStack(spacing: 20) {
                Button {
                    Task { await pronounce() }
                } label: {
                    HStack(spacing: 8) {
                        if speech.isLoading { ProgressView().controlSize(.small) }
                        Text(speech.isLoading ? "Playing..." : (speech.isSpeaking ? "Stop" : "Pronounce"))
                    }
                }
                .buttonStyle(.app(.secondary))
                Button { flipped = true } label: { Text("Show Answer") }
                    .buttonStyle(.app(.primary))
            }
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.deckSky, in: RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
        .shadow(color: .black.opacity(0.15), radius: 25)
        .contentShape(Rectangle())
        .onTapGesture { flipped = true }
    }

    private var back: some View {
        VStack(spacing: 20) {
            Spacer()
            Text(card.chineseWord)
                .font(.system(size: 48, weight: .bold)).tracking(-0.96)
                .multilineTextAlignment(.center).zh()
            VStack(spacing: 8) {
                Text(card.englishTranslation)
                    .font(.app(16, weight: .medium)).foregroundStyle(Color.appMutedForeground)
                    .multilineTextAlignment(.center)
                HStack(spacing: 8) {
                    if let p = card.pronunciation, !p.isEmpty {
                        Text(p).font(.app(16, weight: .medium)).foregroundStyle(Color.appMutedForeground.opacity(0.7))
                    }
                    Button {
                        Task { await pronounce() }
                    } label: {
                        Group {
                            if speech.isLoading { ProgressView().controlSize(.small) }
                            else { Image(systemName: speech.isSpeaking ? "speaker.wave.2.fill" : "speaker.wave.2") }
                        }
                        .frame(width: 24, height: 24)
                        .foregroundStyle(Color.appMutedForeground)
                    }
                    .accessibilityLabel("Play pronunciation")
                }
            }
            .padding(20)

            VStack(spacing: 8) {
                rateButton("No idea", .destructive, .blackout)
                rateButton("Wrong guess", .destructive, .incorrect)
                rateButton("Barely got it", .secondary, .hard)
                rateButton("Got it right", .success, .good)
                rateButton("Too easy", .primary, .easy)
            }
            .padding(.bottom, 20)
        }
        .padding(.horizontal, 20)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.appCard, in: RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
        .shadow(color: .black.opacity(0.15), radius: 25)
    }

    private func rateButton(_ label: String, _ variant: AppButtonVariant, _ q: ResponseQuality) -> some View {
        Button {
            onRate(q, Int(Date().timeIntervalSince(shownAt) * 1000))
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "checkmark").font(.system(size: 14, weight: .semibold))
                Text(label)
                Spacer()
            }
            .padding(.horizontal, 12)
        }
        .buttonStyle(.app(variant, fullWidth: true, height: 48))
        .disabled(disabled)
    }

    private func pronounce() async {
        if speech.isSpeaking { speech.stop(); return }
        await speech.speak(card.chineseWord)
    }
}

#Preview("Question card") {
    ScrollView {
        QuestionCardView(
            card: Flashcard(id: UUID(), chineseWord: "白飯", englishTranslation: "Plain rice", pronunciation: "baak6 faan6",
                            exampleSentenceEnglish: nil, exampleSentenceChinese: nil, createdAt: Date(), updatedAt: Date()),
            disabled: false
        ) { _, _ in }
        .padding(16)
    }
    .background(Color.appBackground)
    .environment(ToastCenter())
}
