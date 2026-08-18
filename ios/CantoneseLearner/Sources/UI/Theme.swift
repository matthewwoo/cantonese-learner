import SwiftUI

// MARK: - Color tokens (mirrors src/app/globals.css)

extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }

    /// Light/dark adaptive color.
    static func adaptive(light: UInt32, dark: UInt32) -> Color {
        Color(UIColor { trait in
            trait.userInterfaceStyle == .dark ? UIColor(Color(hex: dark)) : UIColor(Color(hex: light))
        })
    }

    static let appBackground = adaptive(light: 0xf9f2ec, dark: 0x1c1917)
    static let appForeground = adaptive(light: 0x171515, dark: 0xf5efe9)
    static let appCard = adaptive(light: 0xffffff, dark: 0x262220)
    static let appPrimary = adaptive(light: 0x171515, dark: 0xf9f2ec)
    static let appPrimaryForeground = adaptive(light: 0xffffff, dark: 0x171515)
    static let appSecondary = adaptive(light: 0xf5f5f5, dark: 0x2e2a27)
    static let appSecondaryForeground = adaptive(light: 0x1e1e1e, dark: 0xf5efe9)
    static let appMuted = adaptive(light: 0xf2e9dd, dark: 0x2e2a27)
    static let appMutedForeground = adaptive(light: 0x6e6c66, dark: 0xa8a29e)
    static let appAccent = adaptive(light: 0xf6ead7, dark: 0x37322d)
    static let appDestructive = adaptive(light: 0xdc2626, dark: 0xef4444)
    static let appBorder = adaptive(light: 0xf2e2c4, dark: 0x3a332c)
    static let appRing = adaptive(light: 0x171515, dark: 0xf5efe9)
    static let deckSky = adaptive(light: 0xe8f4ff, dark: 0x1e3a5f)
    static let deckMint = adaptive(light: 0xcff7d3, dark: 0x1e4d2b)
    static let deckBlush = adaptive(light: 0xfdd3d0, dark: 0x5f2b28)
    static let bubbleAssistant = adaptive(light: 0xefefef, dark: 0x2e2a27)
    static let bubbleUser = adaptive(light: 0xdff5e8, dark: 0x1e4d2b)
    static let tabIcon = Color(hex: 0x8C8B89)

    // Study "Got it right" button
    static let green50 = Color(hex: 0xf0fdf4)
    static let green200 = Color(hex: 0xbbf7d0)
    static let green700 = Color(hex: 0x15803d)
    static let green100 = Color(hex: 0xdcfce7)
    static let green600 = Color(hex: 0x16a34a)
    static let orange600 = Color(hex: 0xea580c)
    static let blue500 = Color(hex: 0x3b82f6)

    static func pastel(at index: Int) -> Color {
        [Color.deckSky, .deckMint, .deckBlush][index % 3]
    }
}

// MARK: - Radii

enum Radius {
    static let sm: CGFloat = 8     // buttons
    static let md: CGFloat = 12    // chat bubbles
    static let lg: CGFloat = 16    // inputs
    static let xl: CGFloat = 20    // cards
}

// MARK: - Typography helpers

extension Font {
    /// Inter isn't bundled; SF Pro is the closest system match. CJK falls back to PingFang HK.
    static func app(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight)
    }
}

extension View {
    /// Marks Chinese runs for VoiceOver (mirrors `<Zh lang="zh-HK">`).
    func zh() -> some View {
        self.environment(\.locale, Locale(identifier: "zh-HK"))
    }
}

// MARK: - Common shapes / modifiers

struct CardBackground: ViewModifier {
    var color: Color = .appCard
    var radius: CGFloat = Radius.xl
    var shadow: Bool = true
    func body(content: Content) -> some View {
        content
            .background(color, in: RoundedRectangle(cornerRadius: radius, style: .continuous))
            .shadow(color: shadow ? .black.opacity(0.12) : .clear, radius: 1.5, x: 0, y: 1)
    }
}

extension View {
    func card(color: Color = .appCard, radius: CGFloat = Radius.xl, shadow: Bool = true) -> some View {
        modifier(CardBackground(color: color, radius: radius, shadow: shadow))
    }
}

// MARK: - Buttons (mirrors ui/button.tsx variants)

enum AppButtonVariant { case primary, outline, secondary, ghost, destructive, success }

struct AppButtonStyle: ButtonStyle {
    var variant: AppButtonVariant = .primary
    var fullWidth: Bool = false
    var height: CGFloat = 44
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.app(14, weight: .medium))
            .frame(maxWidth: fullWidth ? .infinity : nil, minHeight: height, maxHeight: height)
            .padding(.horizontal, 20)
            .foregroundStyle(foreground)
            .background(background, in: RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).stroke(border, lineWidth: 1))
            .opacity(isEnabled ? (configuration.isPressed ? 0.8 : 1) : 0.5)
            .offset(y: configuration.isPressed ? 1 : 0)
            .contentShape(Rectangle())
    }

    private var foreground: Color {
        switch variant {
        case .primary: return .appPrimaryForeground
        case .outline, .ghost: return .appForeground
        case .secondary: return .appSecondaryForeground
        case .destructive: return .appDestructive
        case .success: return .green700
        }
    }
    private var background: Color {
        switch variant {
        case .primary: return .appPrimary
        case .outline: return .appBackground
        case .ghost: return .clear
        case .secondary: return .appSecondary
        case .destructive: return .appDestructive.opacity(0.10)
        case .success: return .green50
        }
    }
    private var border: Color {
        switch variant {
        case .outline: return .appBorder
        case .success: return .green200
        default: return .clear
        }
    }
}

extension ButtonStyle where Self == AppButtonStyle {
    static var appPrimary: AppButtonStyle { AppButtonStyle(variant: .primary) }
    static func app(_ variant: AppButtonVariant, fullWidth: Bool = false, height: CGFloat = 44) -> AppButtonStyle {
        AppButtonStyle(variant: variant, fullWidth: fullWidth, height: height)
    }
}

/// Round 40pt outline icon button used in the header.
struct RoundIconButtonStyle: ButtonStyle {
    var size: CGFloat = 40
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .medium))
            .foregroundStyle(Color.appMutedForeground)
            .frame(width: size, height: size)
            .background(Color.appBackground, in: Circle())
            .overlay(Circle().stroke(Color.appBorder, lineWidth: 1))
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}

// MARK: - Inputs

struct AppTextFieldStyle: TextFieldStyle {
    var height: CGFloat = 48
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .font(.app(16))
            .padding(.horizontal, 12)
            .frame(height: height)
            .background(Color.appCard, in: RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).stroke(Color.appBorder, lineWidth: 1))
    }
}

struct FieldLabel: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text).font(.app(14, weight: .medium)).foregroundStyle(Color.appForeground)
    }
}

// MARK: - Shimmering text (mirrors ui/shimmering-text.tsx)

struct ShimmeringText: View {
    let text: String
    var font: Font = .app(14)
    @State private var phase: CGFloat = -1

    var body: some View {
        Text(text)
            .font(font)
            .foregroundStyle(Color.appMutedForeground)
            .overlay {
                GeometryReader { geo in
                    let w = geo.size.width
                    LinearGradient(
                        colors: [.clear, Color.appForeground, .clear],
                        startPoint: .leading, endPoint: .trailing
                    )
                    .frame(width: w * 0.6)
                    .offset(x: phase * w)
                    .mask(Text(text).font(font))
                }
            }
            .onAppear {
                withAnimation(.linear(duration: 2).delay(0.5).repeatForever(autoreverses: false)) {
                    phase = 1.4
                }
            }
    }
}

// MARK: - Loading (emoji pulse used across list pages)

struct EmojiLoadingView: View {
    let emoji: String
    let label: String
    @State private var pulse = false
    var body: some View {
        VStack(spacing: 16) {
            Text(emoji)
                .font(.system(size: 28))
                .frame(width: 64, height: 64)
                .background(Color.white.opacity(0.7), in: Circle())
                .opacity(pulse ? 0.5 : 1)
                .animation(.easeInOut(duration: 1).repeatForever(), value: pulse)
                .onAppear { pulse = true }
            Text(label).font(.app(18, weight: .medium)).foregroundStyle(Color.appMutedForeground)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.appBackground)
    }
}

// MARK: - Toasts (sonner replacement)

@Observable
@MainActor
final class ToastCenter {
    struct Toast: Identifiable, Equatable {
        enum Kind { case info, success, error }
        let id = UUID()
        let message: String
        let kind: Kind
    }
    var current: Toast?
    private var dismissTask: Task<Void, Never>?

    func show(_ message: String, kind: Toast.Kind = .info) {
        current = Toast(message: message, kind: kind)
        dismissTask?.cancel()
        dismissTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(4))
            guard !Task.isCancelled else { return }
            self?.current = nil
        }
    }
    func error(_ message: String) { show(message, kind: .error) }
    func success(_ message: String) { show(message, kind: .success) }
}

struct ToastOverlay: ViewModifier {
    @Environment(ToastCenter.self) private var toasts
    func body(content: Content) -> some View {
        content.overlay(alignment: .top) {
            if let toast = toasts.current {
                HStack(spacing: 8) {
                    Image(systemName: icon(toast.kind)).foregroundStyle(tint(toast.kind))
                    Text(toast.message).font(.app(14)).foregroundStyle(Color.appForeground)
                }
                .padding(.horizontal, 16).padding(.vertical, 12)
                .background(Color.appCard, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).stroke(Color.appBorder))
                .shadow(color: .black.opacity(0.08), radius: 8, y: 2)
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .transition(.move(edge: .top).combined(with: .opacity))
                .onTapGesture { toasts.current = nil }
            }
        }
        .animation(.spring(duration: 0.3), value: toasts.current)
    }
    private func icon(_ k: ToastCenter.Toast.Kind) -> String {
        switch k { case .info: "info.circle"; case .success: "checkmark.circle.fill"; case .error: "exclamationmark.circle.fill" }
    }
    private func tint(_ k: ToastCenter.Toast.Kind) -> Color {
        switch k { case .info: .appMutedForeground; case .success: .green600; case .error: .appDestructive }
    }
}

extension View {
    func toastOverlay() -> some View { modifier(ToastOverlay()) }
}
