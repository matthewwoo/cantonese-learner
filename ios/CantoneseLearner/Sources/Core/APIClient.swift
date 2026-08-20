import Foundation
import Supabase

/// Calls the Next.js `/api/*` routes with `Authorization: Bearer <supabase access token>`.
enum APIClient {
    struct APIError: LocalizedError {
        let status: Int
        let message: String
        var errorDescription: String? { message }
    }

    private struct ErrorBody: Decodable { let error: String?; let details: String? }

    /// Never follow redirects: the API must answer JSON (2xx/4xx/5xx). A 3xx means the
    /// deployed Next middleware is redirecting Bearer-only calls to /auth/signin.
    private final class NoRedirect: NSObject, URLSessionTaskDelegate {
        func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                        newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
            completionHandler(nil)
        }
    }

    private static let session: URLSession = {
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = 120
        cfg.timeoutIntervalForResource = 300
        return URLSession(configuration: cfg, delegate: NoRedirect(), delegateQueue: nil)
    }()

    static func post<Req: Encodable, Res: Decodable>(_ path: String, body: Req, as: Res.Type = Res.self) async throws -> Res {
        let data = try await postRaw(path, body: body)
        do {
            return try JSONDecoder().decode(Res.self, from: data)
        } catch {
            print("APIClient: bad JSON from \(path): \(error) — body: \(String(decoding: data.prefix(300), as: UTF8.self))")
            throw APIError(status: 200, message: "Unexpected response from \(path)")
        }
    }

    static func postRaw<Req: Encodable>(_ path: String, body: Req) async throws -> Data {
        let token = try await supabase.auth.session.accessToken
        var req = URLRequest(url: AppConfig.apiBaseURL.appendingPathComponent(path))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await session.data(for: req)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let parsed = try? JSONDecoder().decode(ErrorBody.self, from: data)
            var msg = parsed?.error ?? "Request failed (\(status))"
            if (300..<400).contains(status) {
                msg = "API redirected (\(status)) — deploy the web app so /api/* accepts Bearer tokens."
            } else if status == 401 {
                msg = "Session expired — please sign in again."
            }
            print("APIClient: POST \(path) → \(status): \(msg)")
            throw APIError(status: status, message: msg)
        }
        return data
    }

    // MARK: Chat

    struct ChatRequest: Encodable {
        let message: String
        let sessionId: UUID?
        let theme: String
        let targetWords: [String]
    }
    struct ChatResponse: Decodable {
        let success: Bool
        let sessionId: UUID
        let message: String
        let translation: String?
        let theme: String?
    }
    static func chat(message: String, sessionID: UUID?, theme: String = "daily_conversation", targetWords: [String] = []) async throws -> ChatResponse {
        try await post("api/chat", body: ChatRequest(message: message, sessionId: sessionID, theme: theme, targetWords: targetWords))
    }

    // MARK: Translate (chat bubble)

    struct TranslateRequest: Encodable { let text: String; let targetLanguage: String }
    struct TranslateResponse: Decodable { let translatedText: String }
    static func translate(_ text: String, to target: String = "en") async throws -> String {
        try await post("api/translate", body: TranslateRequest(text: text, targetLanguage: target), as: TranslateResponse.self).translatedText
    }

    // MARK: TTS

    struct TTSRequest: Encodable { let text: String; let speed: Double }
    struct TTSResponse: Decodable { let success: Bool; let audioData: String }
    static let cantoneseTTSSpeed = 1.0

    /// Returns raw MP3 bytes decoded from the `data:audio/mp3;base64,...` payload.
    static func synthesize(_ text: String, speed: Double = cantoneseTTSSpeed) async throws -> Data {
        let res: TTSResponse = try await post("api/speech/tts", body: TTSRequest(text: text, speed: speed))
        guard let comma = res.audioData.firstIndex(of: ","),
              let bytes = Data(base64Encoded: String(res.audioData[res.audioData.index(after: comma)...])) else {
            throw APIError(status: 200, message: "Invalid audio payload")
        }
        return bytes
    }

    // MARK: Whisper

    struct WhisperRequest: Encodable { let audio: String; let language: String; let audioType: String }
    struct WhisperResponse: Decodable { let success: Bool; let transcript: String? }
    static func transcribe(audio: Data, mimeType: String = "audio/mp4", language: String = "zh") async throws -> String {
        let res: WhisperResponse = try await post("api/speech/whisper",
                                                 body: WhisperRequest(audio: audio.base64EncodedString(), language: language, audioType: mimeType))
        return res.transcript ?? ""
    }

    struct SpeechTranslateRequest: Encodable { let text: String; let targetLanguage: String }
    struct SpeechTranslateResponse: Decodable { let translatedText: String? }
    static func speechTranslate(_ text: String, to target: String = "en") async throws -> String? {
        try await post("api/speech/translate", body: SpeechTranslateRequest(text: text, targetLanguage: target), as: SpeechTranslateResponse.self).translatedText
    }

    // MARK: Flashcards generate

    struct GenerateDeckRequest: Encodable { let name: String; let count: Int; let words: [String]? }
    struct GenerateDeckResponse: Decodable { let message: String? }
    static func generateDeck(name: String, words: [String]) async throws {
        _ = try await post("api/flashcards/generate",
                           body: GenerateDeckRequest(name: name, count: 100, words: words.isEmpty ? nil : words),
                           as: GenerateDeckResponse.self)
    }

    // MARK: Articles

    struct FetchArticleRequest: Encodable { let url: String }
    struct FetchArticleResponse: Decodable {
        let title: String
        let content: String
        let url: String?
        /// True when the server dropped trailing paragraphs to stay under `maxChars`.
        let truncated: Bool?
        let maxChars: Int?
    }
    static func fetchArticle(url: String) async throws -> FetchArticleResponse {
        try await post("api/articles/fetch", body: FetchArticleRequest(url: url))
    }

    struct CreateArticleRequest: Encodable { let title: String; let content: String; let url: String? }
    struct CreateArticleResponse: Decodable { let success: Bool; let articleId: UUID }
    static func createArticle(title: String, content: String, url: String?) async throws -> UUID {
        try await post("api/articles", body: CreateArticleRequest(title: title, content: content, url: url), as: CreateArticleResponse.self).articleId
    }

    struct OCRArticleRequest: Encodable { let images: [String] }
    struct OCRArticleResponse: Decodable { let success: Bool; let title: String?; let content: String }
    /// Sends photographed pages (JPEG bytes, in reading order) for OCR.
    /// English text comes back translated to Traditional Chinese; Chinese text verbatim.
    static func ocrArticle(images: [Data]) async throws -> OCRArticleResponse {
        try await post("api/articles/ocr", body: OCRArticleRequest(images: images.map { $0.base64EncodedString() }))
    }
}
