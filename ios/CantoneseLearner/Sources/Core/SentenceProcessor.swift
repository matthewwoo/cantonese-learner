import Foundation

/// Port of the parts of `src/utils/sentenceProcessor.ts` the reader uses.
struct SentencePair: Identifiable, Equatable {
    let index: Int
    let chinese: String
    let english: String
    var id: Int { index }
}

enum SentenceProcessor {
    /// Splits on sentence terminators, keeping each terminator attached to its sentence.
    private static func split(_ text: String, terminators: Set<Character>) -> [String] {
        var out: [String] = []
        var current = ""
        for ch in text {
            current.append(ch)
            if terminators.contains(ch) {
                out.append(current)
                current = ""
            }
        }
        out.append(current)
        return out
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    static func splitChinese(_ text: String) -> [String] {
        split(text, terminators: ["。", "！", "？", "；"])
    }

    static func splitEnglish(_ text: String) -> [String] {
        split(text, terminators: [".", "!", "?", ";"])
    }

    /// `original[i]` and `translated[i]` are already a matched pair (the API
    /// translates line by line), so pairing happens *within* each line.
    /// Re-splitting the whole article and pairing by global index let a single
    /// stray split ("Dr.", a decimal, an LLM merging two sentences) shift every
    /// block after it by one.
    ///
    /// Within a line, sentences are paired only when both sides split into the
    /// same number of sentences; otherwise the whole line becomes one block, so
    /// a mismatch can never leak past its own paragraph.
    static func process(original: [String], translated: [String]) -> [SentencePair] {
        var pairs: [SentencePair] = []
        for i in 0..<min(original.count, translated.count) {
            let english = original[i].trimmingCharacters(in: .whitespacesAndNewlines)
            let chinese = translated[i].trimmingCharacters(in: .whitespacesAndNewlines)
            if english.isEmpty && chinese.isEmpty { continue }

            let zh = splitChinese(chinese)
            let en = splitEnglish(english)
            let aligned = zh.count > 1 && zh.count == en.count

            let linePairs: [(String, String)] = aligned
                ? Array(zip(zh, en))
                : [(chinese, english)]
            for (c, e) in linePairs {
                pairs.append(SentencePair(index: pairs.count, chinese: c, english: e))
            }
        }
        return pairs
    }
}
