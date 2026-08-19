import SwiftUI

enum ArticleRoute: Hashable {
    case new
    case reader(id: UUID)
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

    var body: some View {
        Group {
            if !model.loaded {
                EmojiLoadingView(emoji: "📖", label: "Loading articles...")
            } else if model.articles.isEmpty {
                ScrollView { emptyState.padding(16).padding(.top, 24) }
            } else {
                ScrollView {
                    LazyVStack(spacing: 24) {
                        ForEach(model.articles) { a in
                            ArticleCard(article: a) { pendingDelete = a }
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
            NavigationLink(value: ArticleRoute.new) { Image(systemName: "plus") }
                .buttonStyle(RoundIconButtonStyle())
                .accessibilityLabel("Add article")
        }
        .navigationDestination(for: ArticleRoute.self) { route in
            switch route {
            case .new: NewArticleView()
            case .reader(let id): ArticleReaderView(articleID: id)
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
            NavigationLink(value: ArticleRoute.new) { Text("Add article").padding(.horizontal, 12) }
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
}

struct ArticleCard: View {
    let article: ArticleSummary
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
            Button(action: onDelete) {
                Image(systemName: "trash").font(.system(size: 14))
                    .foregroundStyle(Color.appMutedForeground)
                    .frame(width: 32, height: 32)
            }
            .padding(8)
            .accessibilityLabel("Delete article")
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

    private var wordCount: Int { content.split(whereSeparator: { $0.isWhitespace }).count }
    private var canCreate: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty &&
        (!content.trimmingCharacters(in: .whitespaces).isEmpty || !url.trimmingCharacters(in: .whitespaces).isEmpty)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Add new article").font(.app(20, weight: .semibold))
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
