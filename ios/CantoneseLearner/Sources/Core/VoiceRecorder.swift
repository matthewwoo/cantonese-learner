import Foundation
import AVFoundation
import Observation

/// Records mono AAC (m4a) for Whisper, publishing a live level for the waveform.
@Observable
@MainActor
final class VoiceRecorder {
    enum State: Equatable { case idle, listening, processing, error(String) }

    private(set) var state: State = .idle
    private(set) var level: Float = 0          // 0...1 smoothed mic level
    private(set) var elapsed: TimeInterval = 0
    private(set) var levels: [Float] = Array(repeating: 0, count: 40)

    private var recorder: AVAudioRecorder?
    private var meterTimer: Timer?
    private var startedAt: Date?
    private var fileURL: URL?
    var maxDuration: TimeInterval = 15

    var onAutoStop: (() -> Void)?

    static func requestPermission() async -> Bool {
        if #available(iOS 17.0, *) {
            return await AVAudioApplication.requestRecordPermission()
        } else {
            return await withCheckedContinuation { c in
                AVAudioSession.sharedInstance().requestRecordPermission { c.resume(returning: $0) }
            }
        }
    }

    func start() async -> Bool {
        guard await Self.requestPermission() else {
            state = .error("Mic blocked")
            return false
        }
        SpeechService.shared.stop()
        SpeechService.configureAudioSession(record: true)
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("speech-\(UUID().uuidString).m4a")
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 16000,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue,
        ]
        do {
            let r = try AVAudioRecorder(url: url, settings: settings)
            r.isMeteringEnabled = true
            guard r.record() else { state = .error("Mic blocked"); return false }
            recorder = r
            fileURL = url
            startedAt = Date()
            elapsed = 0
            levels = Array(repeating: 0, count: 40)
            state = .listening
            meterTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
                Task { @MainActor in self?.tick() }
            }
            return true
        } catch {
            state = .error("Mic blocked")
            return false
        }
    }

    private func tick() {
        guard let r = recorder, let startedAt else { return }
        r.updateMeters()
        let db = r.averagePower(forChannel: 0) // -160...0
        let linear = max(0, min(1, (db + 50) / 50))
        level = level * 0.85 + linear * 0.15
        levels.removeFirst()
        levels.append(level)
        elapsed = Date().timeIntervalSince(startedAt)
        if elapsed >= maxDuration {
            onAutoStop?()
        }
    }

    /// Stops and returns the recorded bytes.
    func stop() -> Data? {
        meterTimer?.invalidate(); meterTimer = nil
        recorder?.stop()
        recorder = nil
        defer { fileURL = nil }
        guard let fileURL, let data = try? Data(contentsOf: fileURL) else {
            state = .idle
            return nil
        }
        try? FileManager.default.removeItem(at: fileURL)
        state = .processing
        return data
    }

    func reset() {
        meterTimer?.invalidate(); meterTimer = nil
        recorder?.stop(); recorder = nil
        state = .idle
        level = 0
        elapsed = 0
    }
}
