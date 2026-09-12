import SwiftUI

enum AppTab: Hashable, CaseIterable {
    case home, cards, chat, read

    var label: String {
        switch self { case .home: "Home"; case .cards: "Cards"; case .chat: "Chat"; case .read: "Read" }
    }
    var icon: String {
        switch self { case .home: "TabHome"; case .cards: "TabCards"; case .chat: "TabChat"; case .read: "TabRead" }
    }
}

/// App shell: native `TabView` (system Liquid Glass bar on iOS 26, standard bar on iOS 17/18)
/// with a NavigationStack per tab. We never draw the bar ourselves — see DESIGN.md.
struct MainTabView: View {
    @Environment(SharedReadInbox.self) private var sharedReads
    @Environment(\.scenePhase) private var scenePhase
    @State private var tab: AppTab = .home
    @State private var toasts = ToastCenter()
    @State private var homePath = NavigationPath()
    @State private var cardsPath = NavigationPath()
    @State private var chatPath = NavigationPath()
    @State private var readPath = NavigationPath()

    var body: some View {
        TabView(selection: $tab) {
            NavigationStack(path: $homePath) { HomeView() }
                .tabItem { Label(AppTab.home.label, image: AppTab.home.icon) }
                .tag(AppTab.home)
            NavigationStack(path: $cardsPath) { DeckListView() }
                .tabItem { Label(AppTab.cards.label, image: AppTab.cards.icon) }
                .tag(AppTab.cards)
            NavigationStack(path: $chatPath) { ChatView() }
                .tabItem { Label(AppTab.chat.label, image: AppTab.chat.icon) }
                .tag(AppTab.chat)
            NavigationStack(path: $readPath) { ArticlesListView() }
                .tabItem { Label(AppTab.read.label, image: AppTab.read.icon) }
                .tag(AppTab.read)
        }
        .tabBarMinimizesOnScroll()
        .background(Color.appBackground.ignoresSafeArea())
        .toastOverlay()
        .environment(toasts)
        .tint(Color.appForeground)
        // Share Extension hand-off: drain the queue whenever we come to the
        // foreground (covers the case where the deep link didn't fire), and
        // open the new-read form for whatever was shared.
        .onAppear { sharedReads.refresh() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { sharedReads.refresh() }
        }
        .onChange(of: sharedReads.pending, initial: true) { _, url in
            guard let url else { return }
            sharedReads.pending = nil
            tab = .read
            readPath = NavigationPath()
            readPath.append(ArticleRoute.new(url: url.absoluteString))
        }
    }
}

private extension View {
    /// iOS 26: the glass tab bar shrinks to icon-only while scrolling down and re-expands on scroll up.
    @ViewBuilder
    func tabBarMinimizesOnScroll() -> some View {
        if #available(iOS 26, *) {
            self.tabBarMinimizeBehavior(.onScrollDown)
        } else {
            self
        }
    }
}

// MARK: - Header (mirrors top-header.tsx)

/// Applies the app's header: centered logo, optional back button, and a trailing round action.
struct AppHeader<Trailing: View>: ViewModifier {
    let trailing: Trailing
    func body(content: Content) -> some View {
        content
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Image("HeaderLogo").resizable().scaledToFit().frame(height: 28)
                        .accessibilityLabel("Cantonese Learner")
                }
                HeaderToolbarItem(placement: .topBarTrailing) { trailing }
            }
            .navigationBarTitleDisplayMode(.inline)
    }
}

extension View {
    func appHeader<T: View>(@ViewBuilder trailing: () -> T) -> some View {
        modifier(AppHeader(trailing: trailing()))
    }
    func appHeader() -> some View {
        modifier(AppHeader(trailing: EmptyView()))
    }
    /// Full-bleed page background.
    func pageBackground() -> some View {
        self.background(Color.appBackground.ignoresSafeArea())
    }
}

/// Toolbar item for header icon buttons: no toolbar background/glass behind the item
/// (iOS 26+ draws one by default), so the plain icon sits directly on the header.
struct HeaderToolbarItem<Content: View>: ToolbarContent {
    let placement: ToolbarItemPlacement
    @ViewBuilder let content: () -> Content

    var body: some ToolbarContent {
        if #available(iOS 26, *) {
            ToolbarItem(placement: placement) { content() }
                .sharedBackgroundVisibility(.hidden)
        } else {
            ToolbarItem(placement: placement) { content() }
        }
    }
}

/// Custom back button matching the web header (plain arrow icon, pops to root).
struct BackToRootButton: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        Button { dismiss() } label: { Image(systemName: "arrow.left") }
            .buttonStyle(RoundIconButtonStyle())
            .accessibilityLabel("Go back")
    }
}
