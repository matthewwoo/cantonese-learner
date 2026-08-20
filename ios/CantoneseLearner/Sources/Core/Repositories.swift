import Foundation
import Supabase

// MARK: - Row types (snake_case DB shapes)

private struct FlashcardRow: Decodable {
    let id: UUID
    let chinese_word: String
    let english_translation: String
    let pronunciation: String?
    let example_sentence_english: String?
    let example_sentence_chinese: String?
    let created_at: Date
    let updated_at: Date

    var model: Flashcard {
        Flashcard(id: id, chineseWord: chinese_word, englishTranslation: english_translation,
                  pronunciation: pronunciation, exampleSentenceEnglish: example_sentence_english,
                  exampleSentenceChinese: example_sentence_chinese, createdAt: created_at, updatedAt: updated_at)
    }
}

private struct CountRow: Decodable { let count: Int }

private struct SetSummaryRow: Decodable {
    let id: UUID
    let name: String
    let image_url: String?
    let status: String?
    let error_message: String?
    let created_at: Date
    let updated_at: Date
    let flashcards: [CountRow]?
}

private struct SetDetailRow: Decodable {
    let id: UUID
    let name: String
    let image_url: String?
    let status: String?
    let error_message: String?
    let created_at: Date
    let updated_at: Date
    let flashcards: [FlashcardRow]
}

private struct StudyCardPriorRow: Decodable {
    let id: UUID?
    let flashcard_id: UUID
    let ease_factor: Double?
    let interval_days: Int?
    let repetitions: Int?
    let next_review_date: Date
    let was_correct: Bool?
    let created_at: Date
}

private struct StudySetRow: Decodable {
    let id: UUID
    let name: String
    let status: String?
    let flashcards: [FlashcardRow]
}

private struct StudySessionRow: Decodable {
    let id: UUID
    let total_cards: Int
    let started_at: Date
}

private struct StudyCardRow: Decodable {
    let id: UUID
    let flashcard_id: UUID
    let study_session_id: UUID
    let ease_factor: Double
    let interval_days: Int
    let repetitions: Int
    let next_review_date: Date
    let was_correct: Bool?
}

private struct ArticleSummaryRow: Decodable {
    let id: UUID
    let title: String
    let source_url: String?
    let status: String?
    let error_message: String?
    let archived_at: Date?
    let created_at: Date
    let updated_at: Date
}

private struct ArticleDetailRow: Decodable {
    let id: UUID
    let title: String
    let source_url: String?
    let status: String?
    let error_message: String?
    let created_at: Date
    let original_content: [String]?
    let translated_content: [String]?
    let word_definitions: [String: WordDefinition]?
}

private struct ReadingSessionRow: Decodable {
    let id: UUID
    let article_id: UUID
    let current_position: Int
    let reading_speed: Double
    let show_translation: Bool
    let total_reading_time: Int
    let started_at: Date
    let last_read_at: Date
    let completed_at: Date?

    var model: ReadingSession {
        ReadingSession(id: id, articleID: article_id, currentPosition: current_position, readingSpeed: reading_speed,
                       showTranslation: show_translation, totalReadingTime: total_reading_time,
                       startedAt: started_at, lastReadAt: last_read_at, completedAt: completed_at)
    }
}

// MARK: - Errors

struct AppError: LocalizedError {
    let message: String
    init(_ message: String) { self.message = message }
    var errorDescription: String? { message }
}

// MARK: - Flashcards (src/lib/data/flashcards.ts)

enum FlashcardsRepo {
    static func listSets() async throws -> [FlashcardSetSummary] {
        let rows: [SetSummaryRow] = try await supabase
            .from("flashcard_sets")
            .select("id, name, image_url, status, error_message, created_at, updated_at, flashcards(count)")
            .order("created_at", ascending: false)
            .execute().value
        return rows.map {
            FlashcardSetSummary(id: $0.id, name: $0.name, imageURL: $0.image_url,
                                flashcardCount: $0.flashcards?.first?.count ?? 0,
                                status: GenerationStatus(raw: $0.status), errorMessage: $0.error_message,
                                createdAt: $0.created_at, updatedAt: $0.updated_at)
        }
    }

    static func getSet(id: UUID) async throws -> FlashcardSetDetail? {
        let row: SetDetailRow? = try await supabase
            .from("flashcard_sets")
            .select("*, flashcards(*)")
            .eq("id", value: id)
            .maybeSingle()
            .execute().value
        guard let row else { return nil }

        var latest: [UUID: StudyCardPriorRow] = [:]
        if !row.flashcards.isEmpty {
            let priors: [StudyCardPriorRow] = try await supabase
                .from("study_cards")
                .select("flashcard_id, next_review_date, was_correct, created_at")
                .in("flashcard_id", values: row.flashcards.map(\.id))
                .order("created_at", ascending: false)
                .execute().value
            for p in priors where latest[p.flashcard_id] == nil { latest[p.flashcard_id] = p }
        }

        let cards = row.flashcards.map { fc in
            FlashcardWithProgress(card: fc.model,
                                  nextReviewDate: latest[fc.id]?.next_review_date,
                                  lastWasCorrect: latest[fc.id]?.was_correct)
        }
        return FlashcardSetDetail(id: row.id, name: row.name, imageURL: row.image_url,
                                  status: GenerationStatus(raw: row.status), errorMessage: row.error_message,
                                  createdAt: row.created_at, flashcards: cards)
    }

    static func deleteSet(id: UUID) async throws {
        try await supabase.from("flashcard_sets").delete().eq("id", value: id).execute()
    }
}

// MARK: - Study (src/lib/data/study.ts)

enum StudyRepo {
    private struct NewSession: Encodable { let user_id: UUID; let total_cards: Int }
    private struct NewStudyCard: Encodable {
        let user_id: UUID
        let flashcard_id: UUID
        let study_session_id: UUID
        let ease_factor: Double
        let interval_days: Int
        let repetitions: Int
        let next_review_date: Date
    }
    private struct AnswerUpdate: Encodable {
        let was_correct: Bool
        let response_time: Int?
        let ease_factor: Double
        let interval_days: Int
        let repetitions: Int
        let next_review_date: Date
    }
    private struct CompleteUpdate: Encodable { let completed_at: Date }

    static func startSession(userID: UUID, setID: UUID, maxCards: Int = 15) async throws -> StartedStudySession {
        let set: StudySetRow? = try await supabase
            .from("flashcard_sets")
            .select("id, name, status, flashcards(*)")
            .eq("id", value: setID)
            .maybeSingle()
            .execute().value
        guard let set else { throw AppError("Flashcard set not found or not accessible") }
        switch GenerationStatus(raw: set.status) {
        case .pending: throw AppError("This deck is still generating. Try again in a moment.")
        case .failed: throw AppError("This deck couldn't be generated. Delete it and try again.")
        case .ready: break
        }
        guard !set.flashcards.isEmpty else { throw AppError("This flashcard set has no cards") }

        let priors: [StudyCardPriorRow] = try await supabase
            .from("study_cards")
            .select("id, flashcard_id, ease_factor, interval_days, repetitions, next_review_date, created_at")
            .in("flashcard_id", values: set.flashcards.map(\.id))
            .order("created_at", ascending: false)
            .execute().value
        var latest: [UUID: StudyCardPriorRow] = [:]
        for p in priors where latest[p.flashcard_id] == nil { latest[p.flashcard_id] = p }

        struct Candidate { let card: FlashcardRow; let prior: StudyCardPriorRow?; let next: Date; let isDue: Bool }
        let now = Date()
        var candidates = set.flashcards.map { fc -> Candidate in
            let prior = latest[fc.id]
            let next = prior?.next_review_date ?? Date(timeIntervalSince1970: 0)
            return Candidate(card: fc, prior: prior, next: next, isDue: next <= now)
        }
        // Fisher–Yates
        if candidates.count > 1 {
            for i in stride(from: candidates.count - 1, through: 1, by: -1) {
                let j = Int.random(in: 0...i)
                candidates.swapAt(i, j)
            }
        }
        // Stable sort: due first, then ascending next review date.
        candidates = candidates.enumerated().sorted { a, b in
            if a.element.isDue != b.element.isDue { return a.element.isDue }
            if a.element.next != b.element.next { return a.element.next < b.element.next }
            return a.offset < b.offset
        }.map(\.element)
        let selected = Array(candidates.prefix(maxCards))

        let session: StudySessionRow = try await supabase
            .from("study_sessions")
            .insert(NewSession(user_id: userID, total_cards: min(maxCards, set.flashcards.count)))
            .select()
            .single()
            .execute().value

        let newCards = selected.map { c -> NewStudyCard in
            let data: SpacedRepetitionData
            if let p = c.prior {
                data = SpacedRepetitionData(easeFactor: p.ease_factor ?? 2.5, interval: p.interval_days ?? 0,
                                            repetitions: p.repetitions ?? 0, nextReviewDate: p.next_review_date)
            } else {
                data = SM2.createInitialReviewData(now: now)
            }
            return NewStudyCard(user_id: userID, flashcard_id: c.card.id, study_session_id: session.id,
                                ease_factor: data.easeFactor, interval_days: data.interval,
                                repetitions: data.repetitions, next_review_date: data.nextReviewDate)
        }
        let inserted: [StudyCardRow] = try await supabase
            .from("study_cards")
            .insert(newCards)
            .select()
            .execute().value
        let byFlashcard = Dictionary(uniqueKeysWithValues: inserted.map { ($0.flashcard_id, $0) })

        let studyCards: [StudyCardWithFlashcard] = selected.enumerated().compactMap { i, c in
            guard let sc = byFlashcard[c.card.id] else { return nil }
            return StudyCardWithFlashcard(id: sc.id, position: i + 1, flashcard: c.card.model,
                                          easeFactor: sc.ease_factor, interval: sc.interval_days,
                                          repetitions: sc.repetitions, nextReviewDate: sc.next_review_date,
                                          wasCorrect: sc.was_correct)
        }
        return StartedStudySession(id: session.id, totalCards: session.total_cards, startedAt: session.started_at,
                                   flashcardSetName: set.name, studyCards: studyCards)
    }

    static func recordResponse(studyCardID: UUID, quality: ResponseQuality, responseTimeMs: Int?) async throws -> StudyResponseResult {
        let sc: StudyCardRow? = try await supabase
            .from("study_cards").select("*").eq("id", value: studyCardID).maybeSingle().execute().value
        guard let sc else { throw AppError("Study card not found or not accessible") }

        let next = SM2.calculateNextReview(
            SpacedRepetitionData(easeFactor: sc.ease_factor, interval: sc.interval_days,
                                 repetitions: sc.repetitions, nextReviewDate: sc.next_review_date),
            quality: quality)
        let wasCorrect = quality.rawValue >= 3

        try await supabase.from("study_cards")
            .update(AnswerUpdate(was_correct: wasCorrect, response_time: responseTimeMs, ease_factor: next.easeFactor,
                                 interval_days: next.interval, repetitions: next.repetitions,
                                 next_review_date: next.nextReviewDate))
            .eq("id", value: studyCardID)
            .execute()

        let total = try await supabase.from("study_cards")
            .select("id", head: true, count: .exact)
            .eq("study_session_id", value: sc.study_session_id)
            .execute().count ?? 0
        let answered = try await supabase.from("study_cards")
            .select("id", head: true, count: .exact)
            .eq("study_session_id", value: sc.study_session_id)
            .not("was_correct", operator: .is, value: "null")
            .execute().count ?? 0
        let isCompleted = answered == total
        if isCompleted {
            try await supabase.from("study_sessions")
                .update(CompleteUpdate(completed_at: Date()))
                .eq("id", value: sc.study_session_id)
                .execute()
        }
        return StudyResponseResult(answered: answered, total: total, isCompleted: isCompleted)
    }
}

// MARK: - Articles (src/lib/data/articles.ts)

enum ArticlesRepo {
    private struct NewReadingSession: Encodable { let user_id: UUID; let article_id: UUID }
    private struct ProgressUpdate: Encodable { let current_position: Int; let last_read_at: Date }

    static func list() async throws -> [ArticleSummary] {
        let rows: [ArticleSummaryRow] = try await supabase
            .from("articles")
            .select("id, title, source_url, status, error_message, archived_at, created_at, updated_at")
            .order("created_at", ascending: false)
            .execute().value
        return rows.map {
            ArticleSummary(id: $0.id, title: $0.title, sourceURL: $0.source_url, status: GenerationStatus(raw: $0.status),
                           errorMessage: $0.error_message, archivedAt: $0.archived_at,
                           createdAt: $0.created_at, updatedAt: $0.updated_at)
        }
    }

    /// Archive is an explicit null/timestamp write: an Encodable struct with an
    /// optional field would drop the nil key and make unarchive a no-op.
    static func setArchived(id: UUID, archived: Bool) async throws {
        let value: AnyJSON = archived ? .string(ISO8601.string(Date())) : .null
        try await supabase.from("articles")
            .update(["archived_at": value])
            .eq("id", value: id)
            .execute()
    }

    static func getWithSession(userID: UUID, articleID: UUID) async throws -> (ArticleDetail, ReadingSession)? {
        let row: ArticleDetailRow? = try await supabase
            .from("articles").select("*").eq("id", value: articleID).maybeSingle().execute().value
        guard let row else { return nil }

        var session: ReadingSessionRow? = try await supabase
            .from("reading_sessions").select("*")
            .eq("article_id", value: articleID)
            .is("completed_at", value: nil)
            .limit(1)
            .maybeSingle()
            .execute().value
        if session == nil {
            session = try await supabase.from("reading_sessions")
                .insert(NewReadingSession(user_id: userID, article_id: articleID))
                .select().single().execute().value
        }
        let article = ArticleDetail(id: row.id, title: row.title, sourceURL: row.source_url,
                                    status: GenerationStatus(raw: row.status), errorMessage: row.error_message,
                                    createdAt: row.created_at, originalContent: row.original_content ?? [],
                                    translatedContent: row.translated_content ?? [],
                                    wordDefinitions: row.word_definitions ?? [:])
        return (article, session!.model)
    }

    static func updateProgress(sessionID: UUID, position: Int) async throws {
        try await supabase.from("reading_sessions")
            .update(ProgressUpdate(current_position: position, last_read_at: Date()))
            .eq("id", value: sessionID)
            .execute()
    }

    static func delete(id: UUID) async throws {
        try await supabase.from("articles").delete().eq("id", value: id).execute()
    }
}

// MARK: - Stats (src/lib/data/stats.ts)

enum StatsRepo {
    private struct FlashcardIDRow: Decodable { let flashcard_id: UUID }
    private struct PositionRow: Decodable { let current_position: Int? }
    private struct StartedRow: Decodable { let started_at: Date }
    private struct CreatedRow: Decodable { let created_at: Date }
    private struct ReadRow: Decodable { let started_at: Date; let last_read_at: Date }

    static func progressStats(weekStart: Date) async throws -> ProgressStats {
        async let reviewed: [FlashcardIDRow] = supabase.from("study_cards")
            .select("flashcard_id")
            .not("was_correct", operator: .is, value: "null")
            .gte("updated_at", value: ISO8601.string(weekStart))
            .execute().value
        async let conversations = supabase.from("chat_sessions")
            .select("id", head: true, count: .exact).execute().count
        async let positions: [PositionRow] = supabase.from("reading_sessions")
            .select("current_position").execute().value

        let (r, c, p) = try await (reviewed, conversations, positions)
        return ProgressStats(wordsReviewedThisWeek: Set(r.map(\.flashcard_id)).count,
                             conversations: c ?? 0,
                             linesRead: p.reduce(0) { $0 + ($1.current_position ?? 0) })
    }

    static func practiceHistory() async throws -> PracticeMap {
        let since = Calendar.current.date(byAdding: .day, value: -365, to: Date())!
        let sinceISO = ISO8601.string(since)
        async let sessions: [StartedRow] = supabase.from("study_sessions")
            .select("started_at").gte("started_at", value: sinceISO).execute().value
        async let chats: [CreatedRow] = supabase.from("chat_messages")
            .select("created_at").eq("role", value: "user").gte("created_at", value: sinceISO).execute().value
        async let reads: [ReadRow] = supabase.from("reading_sessions")
            .select("started_at, last_read_at").gte("last_read_at", value: sinceISO).execute().value

        let (s, c, r) = try await (sessions, chats, reads)
        var map: PracticeMap = [:]
        func mark(_ d: Date, _ k: PracticeKind) { map[PracticeDays.toDayKey(d), default: []].insert(k) }
        s.forEach { mark($0.started_at, .review) }
        c.forEach { mark($0.created_at, .chat) }
        r.forEach { mark($0.started_at, .read); mark($0.last_read_at, .read) }
        return map
    }
}
