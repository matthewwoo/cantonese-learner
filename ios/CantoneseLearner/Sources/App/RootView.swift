import SwiftUI

struct RootView: View {
    @Environment(SessionStore.self) private var session

    var body: some View {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--ui-preview-card") {
            DebugCardPreview()
        } else if ProcessInfo.processInfo.arguments.contains("--ui-preview-book") {
            DebugBookPreview()
        } else {
            content
        }
        #else
        content
        #endif
    }

    @ViewBuilder
    private var content: some View {
        switch session.state {
        case .loading:
            ZStack {
                Color.appBackground.ignoresSafeArea()
                ProgressView()
            }
        case .signedOut:
            AuthFlowView()
        case .signedIn:
            MainTabView()
        }
    }
}

#if DEBUG
/// Local fixture only: exercise the real reader without OCR or remote writes.
private struct DebugBookPreview: View {
    private struct Fixture: Decodable {
        let title: String
        let pages: [ArticleSourcePage]
        let translations: [String]
    }
    @State private var toasts = ToastCenter()
    private var article: ArticleDetail? {
        let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("book-reader-fixture.json")
        guard let data = try? Data(contentsOf: url), let fixture = try? JSONDecoder().decode(Fixture.self, from: data),
              !fixture.pages.isEmpty, fixture.pages.count == fixture.translations.count else { return nil }
        return ArticleDetail(id: UUID(), title: fixture.title, sourceURL: nil, status: .ready, errorMessage: nil,
                             createdAt: Date(), originalContent: fixture.pages.map(\.text),
                             translatedContent: fixture.translations, wordDefinitions: [:], sourcePages: fixture.pages)
    }
    var body: some View {
        NavigationStack {
            if let article {
                ArticleReaderView(articleID: article.id, previewArticle: article)
            } else {
                Text("Install book-reader-fixture.json in the app's Documents folder.")
            }
        }
        .environment(toasts)
    }
}

/// `--ui-preview-card`: study card + article player bar without any data (simulator layout checks).
private struct DebugCardPreview: View {
    @State private var toasts = ToastCenter()
    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 20) {
                    QuestionCardView(
                        card: Flashcard(id: UUID(), chineseWord: "白飯", englishTranslation: "Plain rice", pronunciation: "baak6 faan6",
                                        exampleSentenceEnglish: nil, exampleSentenceChinese: nil, createdAt: Date(), updatedAt: Date()),
                        disabled: false
                    ) { _, _ in }
                    Text("1 of 15").font(.app(16, weight: .medium)).foregroundStyle(Color.appMutedForeground)
                    ChatBubble(message: ChatMessage(role: .assistant, content: "你好！我哋今日講吓咩好呢？", translation: "Hello! What should we talk about today?"))
                    ChatBubble(message: ChatMessage(role: .user, content: "我想學煮嘢食嘅詞語。"))
                }
                .padding(16)
            }
            ArticlePlayerBar(player: ArticlePlayer())
        }
        .background(Color.appBackground.ignoresSafeArea())
        .environment(toasts)
    }
}
#endif
