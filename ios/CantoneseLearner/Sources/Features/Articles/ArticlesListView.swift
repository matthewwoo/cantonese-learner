import SwiftUI
import PhotosUI
import UIKit

enum ArticleRoute: Hashable {
    case new
    case reader(id: UUID)
}

enum ArticleFilter: String, CaseIterable, Identifiable {
    case inbox = "Inbox"
    case archive = "Archive"
    var id: String { rawValue }
}

@Observable
@MainActor
final class ArticlesListModel {
    var articles: [ArticleSummary] = []
    var loaded = false
    private var pollTask: Task<Void, Never>?

    func load(silent: Bool = false, toasts: ToastCenter? = nil) async {
        do {
            articles = try await ArticlesRepo.list()
            loaded = true
            pollTask?.cancel()
            if articles.contains(where: { $0.displayStatus == .pending }) {
                pollTask = Task { [weak self] in
                    try? await Task.sleep(for: .seconds(4))
                    guard !Task.isCancelled else { return }
                    await self?.load(silent: true, toasts: toasts)
                }
            }
        } catch {
            loaded = true
            if !silent { toasts?.error("Unable to load articles") }
        }
    }
    func stopPolling() { pollTask?.cancel() }
}

struct ArticlesListView: View {
    @Environment(ToastCenter.self) private var toasts
    @State private var model = ArticlesListModel()
    @State private var pendingDelete: ArticleSummary?
    @State private var filter: ArticleFilter = .inbox
    @State private var showPhotoPicker = false
    @State private var photoItems: [PhotosPickerItem] = []
    @State private var ocrRunning = false
    @State private var ocrTitle = ""
    @State private var ocrContent = ""
    @State private var showOCRForm = false

    private var filteredArticles: [ArticleSummary] {
        switch filter {
        case .inbox: return model.articles.filter { !$0.isArchived }
        case .archive: return model.articles.filter(\.isArchived)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Shown whenever any reads exist — even if the current filter is
            // empty — so a fully archived inbox never strands the user.
            if model.loaded && !model.articles.isEmpty {
                filterBar
            }
            if !model.loaded {
                EmojiLoadingView(emoji: "📖", label: "Loading articles...")
            } else if model.articles.isEmpty {
                ScrollView { emptyState.padding(16).padding(.top, 24) }
            } else if filteredArticles.isEmpty {
                ScrollView { filterEmptyState.padding(16).padding(.top, 24) }
                    .refreshable { await model.load(toasts: toasts) }
            } else {
                ScrollView {
                    LazyVStack(spacing: 24) {
                        ForEach(filteredArticles) { a in
                            ArticleCard(article: a,
                                        onToggleArchive: { Task { await toggleArchive(a) } },
                                        onDelete: { pendingDelete = a })
                        }
                    }
                    .padding(.horizontal, 16).padding(.vertical, 24)
                    .frame(maxWidth: 448).frame(maxWidth: .infinity)
                }
                .refreshable { await model.load(toasts: toasts) }
            }
        }
        .pageBackground()
        .appHeader {
            Menu {
                NavigationLink(value: ArticleRoute.new) { Label("Add via link", systemImage: "link") }
                Button { showPhotoPicker = true } label: { Label("Add via camera", systemImage: "camera") }
            } label: {
                // Menu can't take RoundIconButtonStyle (ButtonStyle only applies
                // to Button), so its styling is replicated inline.
                Image(systemName: "plus")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Color.appMutedForeground)
                    .frame(width: 40, height: 40)
                    .contentShape(Circle())
            }
            .accessibilityLabel("Add read")
        }
        .navigationDestination(for: ArticleRoute.self) { route in
            switch route {
            case .new: NewArticleView()
            case .reader(let id): ArticleReaderView(articleID: id)
            }
        }
        .navigationDestination(isPresented: $showOCRForm) {
            NewArticleView(prefillTitle: ocrTitle, prefillContent: ocrContent)
        }
        .photosPicker(isPresented: $showPhotoPicker, selection: $photoItems,
                      maxSelectionCount: 4, matching: .images)
        .onChange(of: photoItems) { _, items in
            guard !items.isEmpty else { return }
            Task { await runOCR(items) }
        }
        .overlay {
            if ocrRunning {
                EmojiLoadingView(emoji: "📷", label: "Reading your photos…")
            }
        }
        .task { await model.load(silent: model.loaded, toasts: toasts) }
        .onDisappear { model.stopPolling() }
        .alert("Delete article", isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })) {
            Button("Cancel", role: .cancel) { pendingDelete = nil }
            Button("Delete", role: .destructive) {
                if let a = pendingDelete { Task { await delete(a) } }
                pendingDelete = nil
            }
        } message: { Text("Are you sure you want to delete this article?") }
    }

    private var filterBar: some View {
        HStack(spacing: 4) {
            ForEach(ArticleFilter.allCases) { f in
                Button { filter = f } label: {
                    Text(f.rawValue)
                        .font(.app(14, weight: filter == f ? .semibold : .regular))
                        .foregroundStyle(filter == f ? Color.appForeground : Color.appMutedForeground)
                        .padding(.horizontal, 14).padding(.vertical, 6)
                        .background(filter == f ? Color.appCard : .clear, in: Capsule())
                }
            }
        }
        .padding(4)
        .background(Color.white.opacity(0.5), in: Capsule())
        .padding(.top, 12)
    }

    private var filterEmptyState: some View {
        VStack(spacing: 8) {
            Text(filter == .archive ? "🗄️" : "🎉").font(.system(size: 44)).padding(.bottom, 8)
            Text(filter == .archive ? "No archived reads yet" : "Inbox zero — nothing left to read")
                .font(.app(16, weight: .medium))
            Text(filter == .archive
                 ? "Archive a read from its ⋯ menu to keep your inbox tidy."
                 : "Switch to Archive to revisit past reads.")
                .font(.app(14)).foregroundStyle(Color.appMutedForeground)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity)
        .card()
    }

    private var emptyState: some View {
        VStack(spacing: 0) {
            Text("📖").font(.system(size: 60))
                .frame(width: 128, height: 128)
                .background(Color.white.opacity(0.7), in: Circle())
                .padding(.bottom, 16)
            Text("No articles yet").font(.app(20, weight: .semibold))
            Text("Add your first article to start reading with Cantonese translations.")
                .font(.app(16)).foregroundStyle(Color.appMutedForeground)
                .multilineTextAlignment(.center)
                .padding(.top, 8).padding(.bottom, 24)
            NavigationLink(value: ArticleRoute.new) { Text("Add read").padding(.horizontal, 12) }
                .buttonStyle(.app(.primary))
        }
        .padding(32)
        .frame(maxWidth: .infinity)
        .card()
    }

    private func delete(_ a: ArticleSummary) async {
        do {
            try await ArticlesRepo.delete(id: a.id)
            await model.load(silent: true, toasts: toasts)
        } catch {
            toasts.error("Unable to delete article")
        }
    }

    private func toggleArchive(_ a: ArticleSummary) async {
        do {
            try await ArticlesRepo.setArchived(id: a.id, archived: !a.isArchived)
            await model.load(silent: true, toasts: toasts)
        } catch {
            toasts.error(a.isArchived ? "Unable to unarchive read" : "Unable to archive read")
        }
    }

    // MARK: Add via camera (photo library → OCR)

    private func runOCR(_ items: [PhotosPickerItem]) async {
        ocrRunning = true
        // Clearing the selection is required: picking the same photos again
        // would otherwise not fire onChange.
        defer { ocrRunning = false; photoItems = [] }
        var images: [UIImage] = []
        for item in items {
            guard let data = try? await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data) else {
                toasts.error("Couldn't load one of those photos")
                return
            }
            images.append(image)
        }
        guard let payload = encodeForUpload(images) else {
            toasts.error("Those photos are too large — try fewer pages")
            return
        }
        do {
            let res = try await APIClient.ocrArticle(images: payload)
            ocrTitle = res.title ?? ""
            ocrContent = res.content
            showOCRForm = true
        } catch {
            toasts.error("Couldn't read text from these photos")
        }
    }

    /// Vercel caps request bodies at ~4.5 MB and base64 inflates by 4/3, so the
    /// JPEGs must sum to well under that. Try a readable size first, then a
    /// smaller pass before giving up.
    private func encodeForUpload(_ images: [UIImage]) -> [Data]? {
        let maxBase64Bytes = 3_300_000
        for (side, quality) in [(CGFloat(1600), 0.6), (CGFloat(1200), 0.45)] {
            let jpegs = images.compactMap { $0.downscaled(maxSide: side).jpegData(compressionQuality: quality) }
            guard jpegs.count == images.count else { return nil }
            if jpegs.reduce(0, { $0 + ($1.count * 4 + 2) / 3 }) <= maxBase64Bytes { return jpegs }
        }
        return nil
    }
}

private extension UIImage {
    /// Downscale so the longest side is at most `maxSide`. Re-rendering (even
    /// at scale 1) also normalizes HEIC/orientation and strips EXIF.
    func downscaled(maxSide: CGFloat) -> UIImage {
        let longest = max(size.width, size.height)
        let scale = min(1, maxSide / max(longest, 1))
        let target = CGSize(width: size.width * scale, height: size.height * scale)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: target, format: format).image { _ in
            draw(in: CGRect(origin: .zero, size: target))
        }
    }
}

struct ArticleCard: View {
    let article: ArticleSummary
    let onToggleArchive: () -> Void
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(article.title).font(.app(16, weight: .medium)).zh().padding(.bottom, 4)
            if let host = article.sourceURL.flatMap({ URL(string: $0)?.host }) {
                Text("📎 \(host)").font(.app(14)).foregroundStyle(Color.appMutedForeground).lineLimit(1).padding(.bottom, 8)
            }
            statusLine.padding(.bottom, 24)
            NavigationLink(value: ArticleRoute.reader(id: article.id)) { Text("Start reading") }
                .buttonStyle(.app(.primary))
                .disabled(article.displayStatus != .ready)
        }
        .padding(24)
        .padding(.trailing, 24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
        .overlay(alignment: .topTrailing) {
            Menu {
                Button(action: onToggleArchive) {
                    Label(article.isArchived ? "Unarchive" : "Archive",
                          systemImage: article.isArchived ? "tray.and.arrow.up" : "archivebox")
                }
                Button(role: .destructive, action: onDelete) { Label("Delete", systemImage: "trash") }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.appMutedForeground)
                    .frame(width: 32, height: 32)
                    .contentShape(Rectangle())
            }
            .padding(8)
            .accessibilityLabel("Read options")
        }
    }

    @ViewBuilder
    private var statusLine: some View {
        switch article.displayStatus {
        case .ready:
            Text("Created on \(article.createdAt.formatted(date: .numeric, time: .omitted))")
                .font(.app(14)).foregroundStyle(Color.appMutedForeground)
        case .pending:
            ShimmeringText(text: "Translating…")
        case .failed:
            Text("Couldn't translate this article. Delete it and try again.")
                .font(.app(14)).foregroundStyle(Color.appMutedForeground)
        }
    }
}

// MARK: - New article (/articles/new)

struct NewArticleView: View {
    @Environment(ToastCenter.self) private var toasts
    @Environment(\.dismiss) private var dismiss
    @State private var url = ""
    @State private var title = ""
    @State private var content = ""
    @State private var fetching = false
    @State private var creating = false

    init(prefillTitle: String = "", prefillContent: String = "") {
        _title = State(initialValue: prefillTitle)
        _content = State(initialValue: prefillContent)
    }

    private var wordCount: Int { content.split(whereSeparator: { $0.isWhitespace }).count }
    private var canCreate: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty &&
        (!content.trimmingCharacters(in: .whitespaces).isEmpty || !url.trimmingCharacters(in: .whitespaces).isEmpty)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Add a new read").font(.app(20, weight: .semibold))
                    Text("Paste a URL or enter content below. We'll translate it to Cantonese in the background — your article appears in the list right away.")
                        .font(.app(14)).foregroundStyle(Color.appMutedForeground)
                }
                .padding(.bottom, 4)

                VStack(alignment: .leading, spacing: 8) {
                    FieldLabel("Article URL")
                    HStack(spacing: 8) {
                        TextField("https://example.com/article", text: $url)
                            .textFieldStyle(AppTextFieldStyle(height: 44))
                            .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                        Button { Task { await fetch() } } label: { Text(fetching ? "Fetching…" : "Fetch") }
                            .buttonStyle(.app(.primary))
                            .disabled(fetching || url.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
                VStack(alignment: .leading, spacing: 8) {
                    FieldLabel("Title *")
                    TextField("Enter article title", text: $title).textFieldStyle(AppTextFieldStyle(height: 44))
                }
                VStack(alignment: .leading, spacing: 8) {
                    FieldLabel("Content *")
                    TextEditor(text: $content)
                        .font(.app(16))
                        .scrollContentBackground(.hidden)
                        .padding(8)
                        .frame(minHeight: 192, maxHeight: 384)
                        .background(Color.appCard, in: RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).stroke(Color.appBorder))
                        .overlay(alignment: .topLeading) {
                            if content.isEmpty {
                                Text("Paste or type English article content...")
                                    .font(.app(16)).foregroundStyle(Color.appMutedForeground.opacity(0.6))
                                    .padding(.horizontal, 13).padding(.vertical, 16)
                                    .allowsHitTesting(false)
                            }
                        }
                    if wordCount > 0 {
                        Text("\(wordCount) words — scroll inside the box to read the rest. Trim anything you don't want translated.")
                            .font(.app(12)).foregroundStyle(Color.appMutedForeground)
                    }
                }
                HStack(spacing: 12) {
                    Spacer()
                    Button { dismiss() } label: { Text("Cancel").foregroundStyle(Color.appMutedForeground) }
                        .buttonStyle(.app(.outline))
                    Button { Task { await create() } } label: { Text(creating ? "Creating…" : "Create Article") }
                        .buttonStyle(.app(.primary))
                        .disabled(!canCreate || creating)
                }
            }
            .padding(24)
            .card()
            .padding(16)
            .frame(maxWidth: 480).frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .pageBackground()
        .appHeader()
        .navigationBarBackButtonHidden()
        .toolbar { HeaderToolbarItem(placement: .topBarLeading) { BackToRootButton() } }
    }

    private func fetch() async {
        let u = url.trimmingCharacters(in: .whitespaces)
        guard !u.isEmpty else { toasts.error("Please enter an article URL"); return }
        fetching = true
        defer { fetching = false }
        do {
            let res = try await APIClient.fetchArticle(url: u)
            title = res.title
            content = res.content
            notifyIfTruncated(res)
        } catch {
            toasts.error("Unable to fetch article from this URL")
        }
    }

    private func notifyIfTruncated(_ res: APIClient.FetchArticleResponse) {
        guard res.truncated == true else { return }
        let limit = res.maxChars.map { "\($0 / 1000)k characters" } ?? "the length limit"
        toasts.show("This article is long — only the first \(limit) were imported.")
    }

    private func create() async {
        let t = title.trimmingCharacters(in: .whitespaces)
        var c = content.trimmingCharacters(in: .whitespacesAndNewlines)
        let u = url.trimmingCharacters(in: .whitespaces)
        guard !t.isEmpty else { toasts.error("Please fill in article title"); return }
        guard !c.isEmpty || !u.isEmpty else { toasts.error("Please provide either article content or a URL"); return }
        creating = true
        defer { creating = false }
        if c.isEmpty {
            do {
                let res = try await APIClient.fetchArticle(url: u)
                c = res.content
                notifyIfTruncated(res)
            } catch {
                toasts.error("Unable to fetch content from URL. Please enter content manually."); return
            }
        }
        do {
            _ = try await APIClient.createArticle(title: t, content: c, url: u.isEmpty ? nil : u)
            dismiss()
        } catch {
            toasts.error("Unable to create article")
        }
    }
}
