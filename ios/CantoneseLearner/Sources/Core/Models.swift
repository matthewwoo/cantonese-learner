import Foundation

// MARK: - Generation status (src/lib/generation.ts)

enum GenerationStatus: String, Codable, Sendable {
    case pending, ready, failed

    init(raw: String?) {
        switch raw {
        case "pending": self = .pending
        case "failed": self = .failed
        default: self = .ready
        }
    }

    static let pendingTimeout: TimeInterval = 10 * 60

    /// A `pending` row older than 10 minutes is displayed as `failed`.
    static func display(status: GenerationStatus, createdAt: Date, now: Date = Date()) -> GenerationStatus {
        guard status == .pending else { return status }
        return now.timeIntervalSince(createdAt) > pendingTimeout ? .failed : .pending
    }
}

// MARK: - Flashcards

struct FlashcardSetSummary: Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    let imageURL: String?
    let flashcardCount: Int
    let status: GenerationStatus
    let errorMessage: String?
    let createdAt: Date
    let updatedAt: Date

    var displayStatus: GenerationStatus { GenerationStatus.display(status: status, createdAt: createdAt) }
}

struct Flashcard: Identifiable, Hashable, Sendable {
    let id: UUID
    let chineseWord: String
    let englishTranslation: String
    let pronunciation: String?
    let exampleSentenceEnglish: String?
    let exampleSentenceChinese: String?
    let createdAt: Date
    let updatedAt: Date
}

struct FlashcardWithProgress: Identifiable, Hashable, Sendable {
    let card: Flashcard
    let nextReviewDate: Date?
    let lastWasCorrect: Bool?
    var id: UUID { card.id }
}

struct FlashcardSetDetail: Sendable {
    let id: UUID
    let name: String
    let imageURL: String?
    let status: GenerationStatus
    let errorMessage: String?
    let createdAt: Date
    let flashcards: [FlashcardWithProgress]
    var displayStatus: GenerationStatus { GenerationStatus.display(status: status, createdAt: createdAt) }
}

// MARK: - Study

struct StudyCardWithFlashcard: Identifiable, Sendable {
    let id: UUID
    let position: Int
    let flashcard: Flashcard
    let easeFactor: Double
    let interval: Int
    let repetitions: Int
    let nextReviewDate: Date
    let wasCorrect: Bool?
}

struct StartedStudySession: Sendable {
    let id: UUID
    let totalCards: Int
    let startedAt: Date
    let flashcardSetName: String
    let studyCards: [StudyCardWithFlashcard]
}

struct StudyResponseResult: Sendable {
    let answered: Int
    let total: Int
    let isCompleted: Bool
}

// MARK: - Articles

struct ArticleSummary: Identifiable, Hashable, Sendable {
    let id: UUID
    let title: String
    let sourceURL: String?
    let status: GenerationStatus
    let errorMessage: String?
    let archivedAt: Date?
    let createdAt: Date
    let updatedAt: Date
    var displayStatus: GenerationStatus { GenerationStatus.display(status: status, createdAt: createdAt) }
    var isArchived: Bool { archivedAt != nil }
}

struct WordDefinition: Codable, Hashable, Sendable {
    let pinyin: String
    let english: String
    let traditional: String
}

struct ArticleDetail: Sendable {
    let id: UUID
    let title: String
    let sourceURL: String?
    let status: GenerationStatus
    let errorMessage: String?
    let createdAt: Date
    let originalContent: [String]
    let translatedContent: [String]
    let wordDefinitions: [String: WordDefinition]
    var displayStatus: GenerationStatus { GenerationStatus.display(status: status, createdAt: createdAt) }
}

struct ReadingSession: Sendable {
    let id: UUID
    let articleID: UUID
    let currentPosition: Int
    let readingSpeed: Double
    let showTranslation: Bool
    let totalReadingTime: Int
    let startedAt: Date
    let lastReadAt: Date
    let completedAt: Date?
}

// MARK: - Chat

struct ChatMessage: Identifiable, Equatable, Sendable {
    enum Role: String, Sendable { case user, assistant }
    let id: UUID
    let role: Role
    var content: String
    var translation: String?
    let createdAt: Date

    init(id: UUID = UUID(), role: Role, content: String, translation: String? = nil, createdAt: Date = Date()) {
        self.id = id; self.role = role; self.content = content; self.translation = translation; self.createdAt = createdAt
    }
}

// MARK: - Home stats

enum PracticeKind: String, Sendable, Hashable, CaseIterable { case review, chat, read }
typealias DayKey = String
typealias PracticeMap = [DayKey: Set<PracticeKind>]

struct ProgressStats: Sendable, Equatable {
    var wordsReviewedThisWeek = 0
    var conversations = 0
    var linesRead = 0
}
