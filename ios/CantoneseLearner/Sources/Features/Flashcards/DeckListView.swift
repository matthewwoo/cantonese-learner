import SwiftUI

enum FlashcardRoute: Hashable {
    case study(setID: UUID)
    case detail(setID: UUID)
    case create
}

@Observable
@MainActor
final class DeckListModel {
    var sets: [FlashcardSetSummary] = []
    var loaded = false
    var pollTask: Task<Void, Never>?

    func load(silent: Bool = false, toasts: ToastCenter? = nil) async {
        do {
            sets = try await FlashcardsRepo.listSets()
            loaded = true
            schedulePolling(toasts: toasts)
        } catch {
            loaded = true
            if !silent { toasts?.error("Failed to load flashcard sets") }
        }
    }

    /// While any deck is pending, silently refetch every 4s (use-poll-while-pending.ts).
    private func schedulePolling(toasts: ToastCenter?) {
        pollTask?.cancel()
        guard sets.contains(where: { $0.displayStatus == .pending }) else { return }
        pollTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(4))
            guard !Task.isCancelled else { return }
            await self?.load(silent: true, toasts: toasts)
        }
    }

    func stopPolling() { pollTask?.cancel() }
}

struct DeckListView: View {
    @Environment(ToastCenter.self) private var toasts
    @State private var model = DeckListModel()
    @State private var pendingDelete: FlashcardSetSummary?

    var body: some View {
        Group {
            if !model.loaded {
                EmojiLoadingView(emoji: "📚", label: "Loading flashcards...")
            } else if model.sets.isEmpty {
                ScrollView { emptyState.padding(16).padding(.top, 24) }
            } else {
                ScrollView {
                    LazyVStack(spacing: 24) {
                        ForEach(Array(model.sets.enumerated()), id: \.element.id) { i, set in
                            DeckCard(set: set, color: .pastel(at: i)) {
                                pendingDelete = set
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 24)
                    .frame(maxWidth: 448)
                    .frame(maxWidth: .infinity)
                }
                .refreshable { await model.load(toasts: toasts) }
            }
        }
        .pageBackground()
        .appHeader {
            NavigationLink(value: FlashcardRoute.create) { Image(systemName: "plus") }
                .buttonStyle(RoundIconButtonStyle())
                .accessibilityLabel("Add flashcard deck")
        }
        .navigationDestination(for: FlashcardRoute.self) { route in
            switch route {
            case .create: CreateDeckView()
            case .detail(let id): DeckDetailView(setID: id)
            case .study(let id): StudyView(setID: id)
            }
        }
        .task { await model.load(toasts: toasts) }
        .onAppear { Task { if model.loaded { await model.load(silent: true, toasts: toasts) } } }
        .onDisappear { model.stopPolling() }
        .alert("Delete flashcard set?", isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })) {
            Button("Cancel", role: .cancel) { pendingDelete = nil }
            Button("Delete", role: .destructive) {
                if let set = pendingDelete { Task { await delete(set) } }
                pendingDelete = nil
            }
        } message: {
            Text("Are you sure you want to delete \"\(pendingDelete?.name ?? "")\"? This action cannot be undone.")
        }
    }

    private var emptyState: some View {
        VStack(spacing: 0) {
            Text("📚").font(.system(size: 60))
                .frame(width: 128, height: 128)
                .background(Color.white.opacity(0.7), in: Circle())
                .padding(.bottom, 16)
            Text("No flashcard sets yet").font(.app(20, weight: .semibold))
            Text("Create your first set to start learning Cantonese")
                .font(.app(16)).foregroundStyle(Color.appMutedForeground)
                .multilineTextAlignment(.center)
                .padding(.top, 8).padding(.bottom, 32)
            NavigationLink(value: FlashcardRoute.create) { Text("Generate First Deck").padding(.horizontal, 12) }
                .buttonStyle(.app(.primary))
        }
        .padding(32)
        .frame(maxWidth: .infinity)
        .card()
    }

    private func delete(_ set: FlashcardSetSummary) async {
        do {
            try await FlashcardsRepo.deleteSet(id: set.id)
            await model.load(silent: true, toasts: toasts)
        } catch {
            toasts.error("Failed to delete flashcard set")
        }
    }
}

// MARK: - Deck card

struct DeckCard: View {
    let set: FlashcardSetSummary
    let color: Color
    let onDelete: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            DeckImage(imageURL: set.imageURL, pending: set.displayStatus == .pending)
                .padding(.bottom, 24)
            Text(set.name).font(.app(16, weight: .medium)).multilineTextAlignment(.center)
            statusLine.padding(.bottom, 24)
            NavigationLink(value: FlashcardRoute.study(setID: set.id)) { Text("Start lesson") }
                .buttonStyle(.app(.primary))
                .disabled(set.displayStatus != .ready)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(color, in: RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
        .shadow(color: .black.opacity(0.12), radius: 1.5, y: 1)
        .overlay(alignment: .topTrailing) {
            Menu {
                NavigationLink(value: FlashcardRoute.detail(setID: set.id)) {
                    Label("See all cards", systemImage: "eye")
                }
                .disabled(set.displayStatus != .ready)
                Button(role: .destructive, action: onDelete) { Label("Delete", systemImage: "trash") }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.appMutedForeground)
                    .frame(width: 32, height: 32)
                    .contentShape(Rectangle())
            }
            .padding(12)
            .accessibilityLabel("Deck options")
        }
    }

    @ViewBuilder
    private var statusLine: some View {
        switch set.displayStatus {
        case .ready:
            Text("\(set.flashcardCount) cards").font(.app(14)).foregroundStyle(Color.appMutedForeground)
        case .pending:
            ShimmeringText(text: "Generating cards…")
        case .failed:
            Text(set.errorMessage != nil ? "Couldn't generate this deck. Delete it and try again." : "Generation didn't finish. Delete it and try again.")
                .font(.app(14)).foregroundStyle(Color.appMutedForeground).multilineTextAlignment(.center)
        }
    }
}

/// 128pt circle with the AI cover (data URL) or 📚 fallback.
struct DeckImage: View {
    let imageURL: String?
    let pending: Bool

    var body: some View {
        ZStack {
            Circle().fill(Color.white.opacity(0.7))
            if pending {
                Circle().fill(Color.appMuted).padding(4).opacity(0.8)
            } else if let img = decoded {
                Image(uiImage: img).resizable().scaledToFill()
            } else {
                Text("📚").font(.system(size: 60))
            }
        }
        .frame(width: 128, height: 128)
        .clipShape(Circle())
        .shadow(color: .black.opacity(0.06), radius: 3)
    }

    private var decoded: UIImage? {
        guard let imageURL else { return nil }
        return ImageCache.shared.image(for: imageURL)
    }
}

/// Decodes `data:image/...;base64,...` (and remote URLs lazily) once.
final class ImageCache {
    static let shared = ImageCache()
    private var cache = NSCache<NSString, UIImage>()

    func image(for source: String) -> UIImage? {
        if let hit = cache.object(forKey: source as NSString) { return hit }
        guard source.hasPrefix("data:"), let comma = source.firstIndex(of: ",") else { return nil }
        guard let data = Data(base64Encoded: String(source[source.index(after: comma)...])), let img = UIImage(data: data) else { return nil }
        cache.setObject(img, forKey: source as NSString)
        return img
    }
}
