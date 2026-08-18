import SwiftUI

@Observable
@MainActor
final class ChatModel {
    var messages: [ChatMessage] = []
    var sessionID: UUID?
    var thinking = false
    var autoTTS = true

    func reset() {
        messages = []
        sessionID = nil
        thinking = false
        SpeechService.shared.stop()
    }

    func send(_ text: String, toasts: ToastCenter) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !thinking else { return }
        messages.append(ChatMessage(role: .user, content: trimmed))
        thinking = true
        defer { thinking = false }
        do {
            let res = try await APIClient.chat(message: trimmed, sessionID: sessionID)
            sessionID = res.sessionId
            let reply = ChatMessage(role: .assistant, content: res.message, translation: res.translation)
            messages.append(reply)
            if autoTTS {
                try? await Task.sleep(for: .milliseconds(500))
                await SpeechService.shared.speak(ChineseText.runs(in: res.message))
            }
        } catch {
            toasts.error(error.localizedDescription)
        }
    }
}

struct ChatView: View {
    @Environment(ToastCenter.self) private var toasts
    @State private var model = ChatModel()

    var body: some View {
        messageList
            .safeAreaInset(edge: .bottom) {
                VoicePill(disabled: model.thinking) { transcript in
                    Task { await model.send(transcript, toasts: toasts) }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .frame(maxWidth: 480)
                .frame(maxWidth: .infinity)
            }
            .pageBackground()
        .appHeader {
            Button { model.reset() } label: { Image(systemName: "plus") }
                .buttonStyle(RoundIconButtonStyle())
                .accessibilityLabel("Start new chat")
        }
        .onDisappear { SpeechService.shared.stop() }
    }

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(model.messages) { msg in
                        ChatBubble(message: msg) { translated in
                            if let i = model.messages.firstIndex(where: { $0.id == msg.id }) {
                                model.messages[i].translation = translated
                            }
                        }
                        .id(msg.id)
                    }
                    if model.thinking {
                        Text("AI is thinking…").font(.app(14)).foregroundStyle(Color.appMutedForeground)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .id("thinking")
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 24)
                .frame(maxWidth: 480)
                .frame(maxWidth: .infinity)
            }
            .onChange(of: model.messages.count) {
                withAnimation { proxy.scrollTo(model.messages.last?.id, anchor: .bottom) }
            }
            .onChange(of: model.thinking) {
                if model.thinking { withAnimation { proxy.scrollTo("thinking", anchor: .bottom) } }
            }
        }
    }
}

// MARK: - Bubble (ChatMessage.tsx): tap = TTS, swipe left = English, swipe right = Chinese

struct ChatBubble: View {
    let message: ChatMessage
    /// Called when a lazy translation was fetched so the parent can cache it.
    var onTranslated: ((String) -> Void)? = nil
    /// Article reader: external playback control instead of per-bubble TTS.
    var externalPlaying: Bool? = nil
    var onTapOverride: (() -> Void)? = nil

    @Environment(ToastCenter.self) private var toasts
    @State private var showTranslation = false
    @State private var translating = false
    @State private var dragX: CGFloat = 0
    @State private var speakingThis = false
    private var speech: SpeechService { SpeechService.shared }

    var isUser: Bool { message.role == .user }

    var body: some View {
        HStack {
            if isUser { Spacer(minLength: 0) }
            HStack(alignment: .top, spacing: 12) {
                Button { Task { await toggleSpeech() } } label: {
                    Image(systemName: (externalPlaying ?? (speakingThis && speech.isSpeaking)) ? "pause.fill" : "play.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(Color.appMutedForeground)
                        .frame(width: 24, height: 24)
                }
                .accessibilityLabel(speakingThis && speech.isSpeaking ? "Stop pronunciation" : "Play pronunciation")

                Group {
                    if showTranslation {
                        if translating {
                            Text("Translating…").foregroundStyle(Color.appMutedForeground)
                        } else {
                            Text(message.translation ?? "")
                        }
                    } else {
                        Text(message.content).zh()
                    }
                }
                .font(.app(14))
                .foregroundStyle(Color.appForeground)
                .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, 16).padding(.vertical, 12)
            .background(isUser ? Color.appCard : Color.bubbleUser, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).stroke(isUser ? Color.bubbleAssistant : .clear))
            .shadow(color: .black.opacity(0.05), radius: 1, y: 1)
            .frame(maxWidth: 320, alignment: isUser ? .trailing : .leading)
            .offset(x: dragX)
            .contentShape(Rectangle())
            .onTapGesture { Task { await toggleSpeech() } }
            .gesture(
                DragGesture(minimumDistance: 12)
                    .onChanged { v in dragX = max(-16, min(16, v.translation.width / 4)) }
                    .onEnded { v in
                        withAnimation(.spring(duration: 0.3)) { dragX = 0 }
                        if v.translation.width <= -40 { Task { await reveal() } }
                        else if v.translation.width >= 40 { showTranslation = false }
                    }
            )
            if !isUser { Spacer(minLength: 0) }
        }
        .frame(maxWidth: .infinity)
    }

    private func toggleSpeech() async {
        if let onTapOverride { onTapOverride(); return }
        if speakingThis && speech.isSpeaking { speech.stop(); speakingThis = false; return }
        speakingThis = true
        let text = ChineseText.runs(in: message.content)
        await speech.speak(text.isEmpty ? message.content : text)
        speakingThis = false
    }

    private func reveal() async {
        showTranslation = true
        if message.translation == nil {
            translating = true
            defer { translating = false }
            do {
                let t = try await APIClient.translate(message.content, to: "en")
                onTranslated?(t)
            } catch {
                toasts.error("Unable to fetch translation")
                showTranslation = false
            }
        }
    }
}

// MARK: - Voice pill (ui/voice-pill.tsx + ChatInput.tsx)

struct VoicePill: View {
    let disabled: Bool
    let onTranscript: (String) -> Void

    @Environment(ToastCenter.self) private var toasts
    @State private var recorder = VoiceRecorder()
    @State private var processing = false

    private var expanded: Bool { recorder.state == .listening || processing }

    var body: some View {
        Button {
            Task { await toggle() }
        } label: {
            HStack(spacing: expanded ? 16 : 12) {
                PulsingDot(color: dotColor, pulsing: pulsing)
                Text(label).font(.app(14, weight: .medium))
                    .lineLimit(1)
                if expanded {
                    LiveWaveformView(levels: recorder.levels, processing: processing)
                        .frame(height: 32)
                        .frame(maxWidth: .infinity)
                    if recorder.state == .listening {
                        Text(timeString(recorder.elapsed))
                            .font(.system(size: 12, design: .monospaced)).monospacedDigit()
                            .foregroundStyle(Color.appMutedForeground)
                    }
                }
            }
            .padding(.horizontal, 16)
            .frame(height: expanded ? 64 : 48)
            .frame(maxWidth: expanded ? .infinity : nil)
            .background(Color.appCard, in: Capsule())
            .shadow(color: .black.opacity(expanded ? 0.1 : 0.05), radius: expanded ? 6 : 2, y: 1)
            .foregroundStyle(Color.appForeground)
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .disabled(disabled || processing)
        .opacity(disabled ? 0.6 : 1)
        .animation(.easeOut(duration: 0.3), value: expanded)
        .accessibilityLabel(recorder.state == .listening ? "Stop listening" : "Start voice input")
        .onAppear {
            recorder.maxDuration = 15
            recorder.onAutoStop = { Task { await finish() } }
        }
    }

    private var pulsing: Bool { recorder.state == .listening || processing }

    private var label: String {
        if processing { return "Transcribing" }
        switch recorder.state {
        case .idle: return "Tap to speak"
        case .listening: return "Listening"
        case .processing: return "Transcribing"
        case .error: return "Mic blocked"
        }
    }

    private var dotColor: Color {
        if processing { return .appMutedForeground }
        switch recorder.state {
        case .idle: return .appPrimary
        case .listening, .error: return .appDestructive
        case .processing: return .appMutedForeground
        }
    }

    private func timeString(_ t: TimeInterval) -> String {
        let s = Int(t); return String(format: "%d:%02d", s / 60, s % 60)
    }

    private func toggle() async {
        switch recorder.state {
        case .listening: await finish()
        default: _ = await recorder.start()
        }
    }

    private func finish() async {
        guard recorder.state == .listening, !processing else { return }
        processing = true
        defer { processing = false; recorder.reset() }
        guard let data = recorder.stop(), data.count > 0 else {
            toasts.error("Nothing was transcribed")
            return
        }
        do {
            let transcript = try await APIClient.transcribe(audio: data, mimeType: "audio/mp4", language: "zh")
            let trimmed = transcript.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else {
                toasts.error("Nothing was transcribed")
                return
            }
            onTranscript(trimmed)
        } catch {
            toasts.error(error.localizedDescription)
        }
    }
}

/// Bars centred on the mid-line (mirrors ui/live-waveform.tsx static mode).
struct LiveWaveformView: View {
    let levels: [Float]
    let processing: Bool
    @State private var phase: Double = 0

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0, paused: !processing)) { ctx in
            Canvas { g, size in
                let count = levels.count
                let barW: CGFloat = 3, gap: CGFloat = 2
                let totalW = CGFloat(count) * barW + CGFloat(count - 1) * gap
                let startX = (size.width - totalW) / 2
                let t = ctx.date.timeIntervalSinceReferenceDate
                for i in 0..<count {
                    var level = CGFloat(levels[i]) * 1.6
                    if processing {
                        let x = Double(i) / Double(count)
                        level = CGFloat(0.35 + 0.25 * sin(t * 4 + x * 12) + 0.15 * sin(t * 6.5 + x * 5))
                    }
                    let h = max(3, min(size.height, level * size.height * 0.8))
                    let x = startX + CGFloat(i) * (barW + gap)
                    let rect = CGRect(x: x, y: (size.height - h) / 2, width: barW, height: h)
                    let alpha = 0.4 + Double(min(1, level)) * 0.6
                    g.fill(Path(roundedRect: rect, cornerRadius: 1.5), with: .color(Color.appForeground.opacity(alpha)))
                }
            }
        }
    }
}

/// 10pt status dot; pulses opacity only (isolated so the repeat animation can't leak into layout).
struct PulsingDot: View {
    let color: Color
    let pulsing: Bool
    @State private var dim = false

    var body: some View {
        Circle().fill(color)
            .frame(width: 10, height: 10)
            .opacity(pulsing && dim ? 0.4 : 1)
            .onChange(of: pulsing, initial: true) {
                if pulsing {
                    withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) { dim = true }
                } else {
                    withAnimation(.default) { dim = false }
                }
            }
    }
}
