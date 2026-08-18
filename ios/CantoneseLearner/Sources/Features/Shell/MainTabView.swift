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

/// App shell: custom bottom tab bar (mirrors bottom-nav.tsx) with a NavigationStack per tab.
struct MainTabView: View {
    @State private var tab: AppTab = .home
    @State private var toasts = ToastCenter()
    @State private var homePath = NavigationPath()
    @State private var cardsPath = NavigationPath()
    @State private var chatPath = NavigationPath()
    @State private var readPath = NavigationPath()

    var body: some View {
        VStack(spacing: 0) {
            Group {
                switch tab {
                case .home:
                    NavigationStack(path: $homePath) { HomeView() }
                case .cards:
                    NavigationStack(path: $cardsPath) { DeckListView() }
                case .chat:
                    NavigationStack(path: $chatPath) { ChatView() }
                case .read:
                    NavigationStack(path: $readPath) { ArticlesListView() }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            BottomTabBar(selected: $tab)
        }
        .background(Color.appBackground.ignoresSafeArea())
        .toastOverlay()
        .environment(toasts)
        .tint(Color.appForeground)
    }
}

struct BottomTabBar: View {
    @Binding var selected: AppTab

    var body: some View {
        HStack {
            ForEach(AppTab.allCases, id: \.self) { t in
                Button {
                    selected = t
                } label: {
                    VStack(spacing: 4) {
                        Image(t.icon)
                            .renderingMode(.template)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 24, height: 24)
                            .foregroundStyle(selected == t ? Color.appForeground : Color.tabIcon)
                            .opacity(selected == t ? 1 : 0.8)
                        Text(t.label)
                            .font(.app(14))
                            .foregroundStyle(selected == t ? Color.appForeground : Color.appMutedForeground)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 8)
                    .background(selected == t ? Color.appCard.opacity(0.7) : .clear,
                                in: RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
                .accessibilityLabel(t.label)
                .accessibilityAddTraits(selected == t ? [.isSelected] : [])
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 4)
        .background(.bar, ignoresSafeAreaEdges: .bottom)
        .overlay(alignment: .top) { Rectangle().fill(Color.appBorder).frame(height: 1) }
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
                ToolbarItem(placement: .topBarTrailing) { trailing }
            }
            .toolbarBackground(Color.appBackground.opacity(0.95), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
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

/// Custom back button matching the web header (round outline arrow, pops to root).
struct BackToRootButton: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        Button { dismiss() } label: { Image(systemName: "arrow.left") }
            .buttonStyle(RoundIconButtonStyle())
            .accessibilityLabel("Go back")
    }
}
