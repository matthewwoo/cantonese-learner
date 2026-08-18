import SwiftUI
import Supabase

/// Signed-out flow: marketing landing → sign in / sign up (mirrors `/`, `/auth/signin`, `/auth/signup`).
struct AuthFlowView: View {
    @State private var toasts = ToastCenter()

    var body: some View {
        NavigationStack {
            LandingView()
                .navigationDestination(for: AuthRoute.self) { route in
                    switch route {
                    case .signIn: SignInView()
                    case .signUp: SignUpView()
                    }
                }
        }
        .toastOverlay()
        .environment(toasts)
        .tint(Color.appForeground)
    }
}

enum AuthRoute: Hashable { case signIn, signUp }

struct LandingView: View {
    @State private var appeared = false
    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            Image("AppLogo")
                .resizable().scaledToFit()
                .frame(width: 112, height: 112)
                .padding(24)
                .background(Color.appAccent, in: Circle())
                .shadow(color: .black.opacity(0.06), radius: 2, y: 1)
            Text("Bun")
                .font(.system(size: 48, weight: .bold))
                .tracking(-1)
                .padding(.top, 32)
            Text("Your Cantonese Buddy").font(.app(20)).foregroundStyle(Color.appMutedForeground).padding(.top, 12)
            Spacer()
            VStack(spacing: 12) {
                NavigationLink(value: AuthRoute.signUp) { Text("Get Started") }
                    .buttonStyle(.app(.primary, fullWidth: true))
                NavigationLink(value: AuthRoute.signIn) { Text("Log In") }
                    .buttonStyle(.app(.outline, fullWidth: true))
            }
            .padding(.bottom, 24)
        }
        .frame(maxWidth: 384)
        .padding(.horizontal, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .pageBackground()
        .opacity(appeared ? 1 : 0)
        .onAppear { withAnimation(.easeOut(duration: 0.7)) { appeared = true } }
        .toolbar(.hidden, for: .navigationBar)
    }
}

struct SignInView: View {
    @Environment(ToastCenter.self) private var toasts
    @State private var email = ""
    @State private var password = ""
    @State private var loading = false

    var body: some View {
        AuthCard {
            Text("Welcome back").font(.app(24, weight: .bold))
            .frame(maxWidth: .infinity)
            .padding(.bottom, 24)

            VStack(alignment: .leading, spacing: 8) {
                FieldLabel("Email")
                TextField("Email", text: $email)
                    .textFieldStyle(AppTextFieldStyle())
                    .keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                    .textContentType(.emailAddress)
            }
            VStack(alignment: .leading, spacing: 8) {
                FieldLabel("Password")
                SecureField("Password", text: $password)
                    .textFieldStyle(AppTextFieldStyle())
                    .textContentType(.password)
            }
            .padding(.top, 16)

            Button {
                Task { await signIn() }
            } label: {
                Text(loading ? "Signing In..." : "Sign In")
            }
            .buttonStyle(.app(.primary, fullWidth: true))
            .disabled(loading || email.isEmpty || password.isEmpty)
            .padding(.top, 24)

            HStack(spacing: 4) {
                Text("Don't have an account?").foregroundStyle(Color.appMutedForeground)
                NavigationLink(value: AuthRoute.signUp) { Text("Sign up").underline().fontWeight(.medium) }
            }
            .font(.app(14))
            .frame(maxWidth: .infinity)
            .padding(.top, 16)
        }
    }

    private func signIn() async {
        loading = true
        defer { loading = false }
        do {
            _ = try await supabase.auth.signIn(email: email.trimmingCharacters(in: .whitespaces), password: password)
        } catch {
            toasts.error("Invalid credentials")
        }
    }
}

struct SignUpView: View {
    @Environment(ToastCenter.self) private var toasts
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var loading = false
    @State private var confirmationSent = false

    var body: some View {
        AuthCard {
            Text("Start lesson").font(.app(24, weight: .bold))
            .frame(maxWidth: .infinity)
            .padding(.bottom, 24)

            if confirmationSent {
                Text("Check your email to confirm your account, then sign in.")
                    .font(.app(14))
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(16)
                    .background(Color.appAccent, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).stroke(Color.appBorder))
                    .padding(.bottom, 16)
            }

            VStack(alignment: .leading, spacing: 8) {
                FieldLabel("Name (optional)")
                TextField("Name (optional)", text: $name).textFieldStyle(AppTextFieldStyle()).textContentType(.name)
            }
            VStack(alignment: .leading, spacing: 8) {
                FieldLabel("Email")
                TextField("Email", text: $email)
                    .textFieldStyle(AppTextFieldStyle())
                    .keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                    .textContentType(.emailAddress)
            }
            .padding(.top, 16)
            VStack(alignment: .leading, spacing: 8) {
                FieldLabel("Password")
                SecureField("Password (min 6 characters)", text: $password)
                    .textFieldStyle(AppTextFieldStyle())
                    .textContentType(.newPassword)
            }
            .padding(.top, 16)

            Button {
                Task { await signUp() }
            } label: {
                Text(loading ? "Creating Account..." : "Sign Up")
            }
            .buttonStyle(.app(.primary, fullWidth: true))
            .disabled(loading || email.isEmpty || password.count < 6)
            .padding(.top, 24)

            HStack(spacing: 4) {
                Text("Already have an account?").foregroundStyle(Color.appMutedForeground)
                NavigationLink(value: AuthRoute.signIn) { Text("Sign in").underline().fontWeight(.medium) }
            }
            .font(.app(14))
            .frame(maxWidth: .infinity)
            .padding(.top, 16)
        }
    }

    private func signUp() async {
        loading = true
        defer { loading = false }
        do {
            let trimmedName = name.trimmingCharacters(in: .whitespaces)
            let data: [String: AnyJSON]? = trimmedName.isEmpty ? nil : ["name": .string(trimmedName)]
            let res = try await supabase.auth.signUp(email: email.trimmingCharacters(in: .whitespaces), password: password, data: data)
            if res.session == nil {
                confirmationSent = true
            }
        } catch {
            toasts.error(error.localizedDescription.isEmpty ? "Registration failed" : error.localizedDescription)
        }
    }
}

private struct AuthCard<Content: View>: View {
    @ViewBuilder let content: Content
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) { content }
                .padding(24)
                .frame(maxWidth: 448)
                .card()
                .padding(16)
                .frame(maxWidth: .infinity)
                .padding(.top, 40)
        }
        .scrollDismissesKeyboard(.interactively)
        .pageBackground()
        .toolbar(.hidden, for: .navigationBar)
        .overlay(alignment: .topLeading) {
            BackToRootButton().padding(16)
        }
    }
}
