import SwiftUI

/// Mirrors components/flashcards/UploadForm.tsx — AI deck generation.
struct CreateDeckView: View {
    @Environment(ToastCenter.self) private var toasts
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var words: [String] = []
    @State private var submitting = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text("Create new deck").font(.app(24, weight: .semibold))
                    Spacer()
                    Button { dismiss() } label: {
                        Image(systemName: "xmark").font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color.appMutedForeground)
                            .frame(width: 32, height: 32)
                    }
                    .accessibilityLabel("Close")
                }
                Divider().overlay(Color.appBorder).padding(.top, 12)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Set Name *").font(.app(14)).foregroundStyle(Color.appMutedForeground)
                    TextField("e.g., Daily Conversations", text: $name).textFieldStyle(AppTextFieldStyle())
                }
                .padding(.vertical, 20)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Words to Include (Optional)").font(.app(14)).foregroundStyle(Color.appMutedForeground)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Add English words and we'll translate them into Cantonese for the deck. Leave empty to let AI choose.")
                            .font(.app(12)).foregroundStyle(Color.appMutedForeground)
                        if words.isEmpty {
                            Text("No words added.").font(.app(12)).foregroundStyle(Color.appMutedForeground)
                        }
                        ForEach(words.indices, id: \.self) { i in
                            HStack(spacing: 8) {
                                TextField("English word (e.g., thank you)", text: $words[i])
                                    .textFieldStyle(AppTextFieldStyle(height: 40))
                                Button {
                                    words.remove(at: i)
                                } label: {
                                    Image(systemName: "xmark").font(.system(size: 12, weight: .semibold))
                                        .foregroundStyle(Color.appMutedForeground).frame(width: 32, height: 32)
                                }
                                .accessibilityLabel("Remove word \(i + 1)")
                            }
                        }
                        Button { words.append("") } label: { Text("Add word") }
                            .buttonStyle(.app(.secondary, height: 36))
                    }
                    .padding(16)
                    .background(Color.appBackground, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).stroke(Color.appBorder))
                }
                .padding(.vertical, 20)

                Button {
                    Task { await submit() }
                } label: {
                    HStack(spacing: 8) {
                        if submitting { ProgressView().tint(Color.appPrimaryForeground).controlSize(.small) }
                        Text(submitting ? "Creating…" : "Generate Deck")
                    }
                }
                .buttonStyle(.app(.primary, fullWidth: true))
                .disabled(submitting)

                Text("100 cards and a deck image are generated in the background. Your deck appears right away and fills in as it finishes — you can keep using the app.")
                    .font(.app(12)).foregroundStyle(Color.appMutedForeground)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 12)
            }
            .padding(24)
            .card()
            .padding(16)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .pageBackground()
        .appHeader()
        .navigationBarBackButtonHidden()
        .toolbar { ToolbarItem(placement: .topBarLeading) { BackToRootButton() } }
    }

    private func submit() async {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { toasts.error("Please enter a set name"); return }
        submitting = true
        defer { submitting = false }
        do {
            let cleaned = words.map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
            try await APIClient.generateDeck(name: trimmed, words: cleaned)
            dismiss()
        } catch {
            toasts.error(error.localizedDescription.isEmpty ? "Generation failed" : error.localizedDescription)
        }
    }
}

// MARK: - Set detail (/flashcards/set/[id])

struct DeckDetailView: View {
    let setID: UUID
    @State private var detail: FlashcardSetDetail?
    @State private var loading = true

    var body: some View {
        Group {
            if loading {
                EmojiLoadingView(emoji: "📚", label: "Loading cards...")
            } else if let detail {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        Text(detail.name).font(.app(20, weight: .bold)).padding(.bottom, 8)
                        switch detail.displayStatus {
                        case .pending:
                            ShimmeringText(text: "Generating cards…", font: .app(16))
                                .frame(maxWidth: .infinity).padding(.vertical, 40)
                        case .failed:
                            Text("This deck couldn't be generated. Delete it and try again.")
                                .font(.app(14)).foregroundStyle(Color.appMutedForeground)
                        case .ready:
                            if detail.flashcards.isEmpty {
                                Text("No cards in this set.").font(.app(14)).foregroundStyle(Color.appMutedForeground)
                            }
                            ForEach(Array(detail.flashcards.enumerated()), id: \.element.id) { i, c in
                                CardRow(index: i + 1, card: c)
                            }
                        }
                    }
                    .padding(.horizontal, 16).padding(.vertical, 24)
                    .frame(maxWidth: 448).frame(maxWidth: .infinity)
                }
            } else {
                Text("Set not found").foregroundStyle(Color.appMutedForeground)
            }
        }
        .pageBackground()
        .appHeader()
        .navigationBarBackButtonHidden()
        .toolbar { ToolbarItem(placement: .topBarLeading) { BackToRootButton() } }
        .task {
            detail = try? await FlashcardsRepo.getSet(id: setID)
            loading = false
        }
    }
}

private struct CardRow: View {
    let index: Int
    let card: FlashcardWithProgress

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top) {
                Text(card.card.chineseWord).font(.app(18, weight: .bold)).zh()
                Spacer()
                Text("#\(index)").font(.system(size: 12, design: .monospaced)).foregroundStyle(Color.appMutedForeground.opacity(0.7))
            }
            Text(card.card.englishTranslation).font(.app(16)).foregroundStyle(Color.appMutedForeground)
            if let p = card.card.pronunciation, !p.isEmpty {
                Text(p).font(.app(14)).italic().foregroundStyle(Color.appMutedForeground)
            }
            HStack {
                Text("Review:").foregroundStyle(Color.appMutedForeground.opacity(0.7))
                Text(reviewText.0).foregroundStyle(reviewText.1).fontWeight(.medium)
                Spacer()
                if let last = card.lastWasCorrect {
                    Text("Last:").foregroundStyle(Color.appMutedForeground.opacity(0.7))
                    Text(last ? "Correct" : "Incorrect")
                        .font(.app(12, weight: .medium))
                        .padding(.horizontal, 8).frame(height: 20)
                        .foregroundStyle(last ? Color.green700 : Color.appDestructive)
                        .background(last ? Color.green100 : Color.appDestructive.opacity(0.1), in: Capsule())
                }
            }
            .font(.app(12))
            .padding(.top, 12)
            .overlay(alignment: .top) { Rectangle().fill(Color.appBorder).frame(height: 1) }
            .padding(.top, 8)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }

    private var reviewText: (String, Color) {
        guard let next = card.nextReviewDate else { return ("New card", .blue500) }
        let cal = Calendar.current
        let days = cal.dateComponents([.day], from: cal.startOfDay(for: Date()), to: cal.startOfDay(for: next)).day ?? 0
        if next < Date() && days < 0 { return ("Overdue", .orange600) }
        if days <= 0 { return ("Due today", .orange600) }
        if days == 1 { return ("Due tomorrow", .green600) }
        return ("Due in \(days) days", .green600)
    }
}
