import Foundation
import AVFoundation
import Observation

/// Cantonese TTS — server (MiniMax via /api/speech/tts) with `AVSpeechSynthesizer` zh-HK fallback.
/// Mirrors the generation-token cancellation semantics of `src/utils/textToSpeech.ts`.
@Observable
@MainActor
final class SpeechService: NSObject, AVAudioPlayerDelegate, AVSpeechSynthesizerDelegate {
    static let shared = SpeechService()

    private(set) var isSpeaking = false
    private(set) var isLoading = false

    private var player: AVAudioPlayer?
    private let synth = AVSpeechSynthesizer()
    private var generation = 0
    private var cache: [String: Data] = [:]
    private var finishContinuation: CheckedContinuation<Void, Never>?

    override init() {
        super.init()
        synth.delegate = self
    }

    static func configureAudioSession(record: Bool = false) {
        let s = AVAudioSession.sharedInstance()
        do {
            if record {
                try s.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
            } else {
                try s.setCategory(.playback, mode: .default, options: [])
            }
            try s.setActive(true)
        } catch {
            print("AudioSession error: \(error)")
        }
    }

    /// Fetches (and caches) MP3 for `text`.
    func audio(for text: String, speed: Double = APIClient.cantoneseTTSSpeed) async throws -> Data {
        let key = "\(speed)|\(text)"
        if let d = cache[key] { return d }
        let d = try await APIClient.synthesize(text, speed: speed)
        cache[key] = d
        return d
    }

    /// Speak text; resolves when playback finishes (or is superseded).
    func speak(_ text: String, rate: Double = APIClient.cantoneseTTSSpeed) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        stop()
        generation += 1
        let gen = generation
        isLoading = true
        // Only the fetch is "loading"; playback is `isSpeaking`. Clear on every exit path for
        // this generation (a newer speak()/stop() already reset it).
        defer { if gen == generation { isLoading = false } }

        do {
            let data = try await audio(for: trimmed, rate: rate)
            guard gen == generation else { return }
            isLoading = false
            // NOTE: don't go through `play(data:)` — it calls stop() and bumps `generation`,
            // which would make this call's `gen` stale and leave state out of sync.
            await play(data: data, rate: 1.0, generation: gen)
        } catch {
            guard gen == generation else { return }
            isLoading = false
            // Server TTS failed → fall back to on-device zh-HK voice for this call only.
            await speakWithSystemVoice(trimmed, rate: rate)
        }
    }

    private func audio(for text: String, rate: Double) async throws -> Data { try await audio(for: text, speed: rate) }

    /// Play raw MP3 data (used by the article player). `rate` is a playback multiplier.
    func play(data: Data, rate: Float = 1.0) async {
        stop()
        generation += 1
        await play(data: data, rate: rate, generation: generation)
    }

    /// Plays within an already-claimed generation (no stop()/bump).
    private func play(data: Data, rate: Float, generation gen: Int) async {
        Self.configureAudioSession()
        do {
            let p = try AVAudioPlayer(data: data)
            p.enableRate = true
            p.rate = rate
            p.delegate = self
            player = p
            isSpeaking = true
            p.play()
            await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in
                finishContinuation = c
            }
        } catch {
            print("AVAudioPlayer error: \(error)")
        }
        if gen == generation { isSpeaking = false }
    }

    private func speakWithSystemVoice(_ text: String, rate: Double) async {
        Self.configureAudioSession()
        let utt = AVSpeechUtterance(string: text)
        utt.voice = AVSpeechSynthesisVoice(language: "zh-HK")
        utt.rate = AVSpeechUtteranceDefaultSpeechRate * Float(rate)
        isSpeaking = true
        synth.speak(utt)
        await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in
            finishContinuation = c
        }
        isSpeaking = false
    }

    func stop() {
        generation += 1
        player?.stop()
        player = nil
        if synth.isSpeaking { synth.stopSpeaking(at: .immediate) }
        isSpeaking = false
        isLoading = false   // an in-flight speak() is now a stale generation and won't clear this itself
        finishContinuation?.resume()
        finishContinuation = nil
    }

    // Player controls used by the article player
    var currentTime: TimeInterval { player?.currentTime ?? 0 }
    var duration: TimeInterval { player?.duration ?? 0 }
    var isPlaying: Bool { player?.isPlaying ?? false }
    func pause() { player?.pause(); isSpeaking = false }
    func resume() { player?.play(); isSpeaking = player?.isPlaying ?? false }
    func seek(to t: TimeInterval) { player?.currentTime = max(0, min(t, duration)) }
    func setRate(_ r: Float) { player?.rate = r }

    // MARK: Delegates
    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in
            self.isSpeaking = false
            self.finishContinuation?.resume()
            self.finishContinuation = nil
        }
    }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor in
            self.isSpeaking = false
            self.finishContinuation?.resume()
            self.finishContinuation = nil
        }
    }
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        Task { @MainActor in
            self.finishContinuation?.resume()
            self.finishContinuation = nil
        }
    }
}

/// Extracts the Chinese runs of a message (mirrors ChatMessage.tsx: CJK ranges joined by spaces).
enum ChineseText {
    static func runs(in text: String) -> String {
        var runs: [String] = []
        var current = ""
        for scalar in text.unicodeScalars {
            if (0x4E00...0x9FFF).contains(scalar.value) || (0x3400...0x4DBF).contains(scalar.value) || (0x3000...0x303F).contains(scalar.value) || (0xFF00...0xFFEF).contains(scalar.value) {
                current.unicodeScalars.append(scalar)
            } else if !current.isEmpty {
                runs.append(current); current = ""
            }
        }
        if !current.isEmpty { runs.append(current) }
        return runs.joined(separator: " ")
    }
    static func containsChinese(_ text: String) -> Bool {
        text.unicodeScalars.contains { (0x4E00...0x9FFF).contains($0.value) }
    }
}
