import Foundation

/// Port of the parts of `src/utils/sentenceProcessor.ts` the reader uses.
struct SentencePair: Identifiable, Equatable {
    let index: Int
    let chinese: String
    let english: String
    var id: Int { index }
}

enum SentenceProcessor {
    static func splitChinese(_ text: String) -> [String] {
        text.split(whereSeparator: { "。！？；".contains($0) })
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    static func splitEnglish(_ text: String) -> [String] {
        text.split(whereSeparator: { ".!?;".contains($0) })
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    /// Pairs Chinese and English sentences by index up to the shorter count.
    /// Falls back to paragraph pairs when either side has no sentences.
    static func process(original: [String], translated: [String]) -> [SentencePair] {
        let zh = splitChinese(translated.joined(separator: "\n"))
        let en = splitEnglish(original.joined(separator: "\n"))
        let n = min(zh.count, en.count)
        if n == 0 {
            return translated.enumerated().map { i, line in
                SentencePair(index: i, chinese: line, english: i < original.count ? original[i] : "")
            }
        }
        return (0..<n).map { SentencePair(index: $0, chinese: zh[$0], english: en[$0]) }
    }
}
