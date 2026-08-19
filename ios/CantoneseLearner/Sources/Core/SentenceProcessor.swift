import Foundation

/// Port of the parts of `src/utils/sentenceProcessor.ts` the reader uses.
struct SentencePair: Identifiable, Equatable {
    let index: Int
    let chinese: String
    let english: String
    var id: Int { index }
}

enum SentenceProcessor {
    private static let chineseTerminators: Set<Character> = ["。", "！", "？", "；"]
    private static let chineseClosers: Set<Character> = ["」", "』", "”", "’", "）", "》", "〉"]
    private static let englishTerminators: Set<Character> = [".", "!", "?", ";"]
    private static let englishClosers: Set<Character> = ["\"", "'", "”", "’", ")", "]"]

    /// Tokens that end in "." without ending a sentence. Single capital letters
    /// (initials, "U.S.") are handled separately.
    private static let englishAbbreviations: Set<String> = [
        "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "mt", "vs", "etc", "no",
        "inc", "ltd", "co", "corp", "fig", "approx", "gov", "sen", "rep", "gen",
        "col", "capt", "lt", "sgt", "hon", "rev", "jan", "feb", "mar", "apr", "jun",
        "jul", "aug", "sep", "sept", "oct", "nov", "dec", "e.g", "i.e", "u.s", "u.k",
    ]

    /// A sentence ends at 。！？； plus any closing quotes/brackets that follow.
    static func splitChinese(_ text: String) -> [String] {
        let chars = Array(text)
        var out: [String] = []
        var start = 0
        var i = 0
        while i < chars.count {
            if chineseTerminators.contains(chars[i]) {
                while i < chars.count, chineseTerminators.contains(chars[i]) { i += 1 }
                while i < chars.count, chineseClosers.contains(chars[i]) { i += 1 }
                out.append(String(chars[start..<i]))
                start = i
            } else {
                i += 1
            }
        }
        if start < chars.count { out.append(String(chars[start...])) }
        return out
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    /// A boundary is a run of .!?; (plus closing quotes/brackets) followed by
    /// whitespace or end of text — so decimals ("3.5"), URLs and "e.g." mid-word
    /// never split — and not preceded by a known abbreviation or a single-letter
    /// initial ("Dr.", "J. Smith", "U.S.").
    static func splitEnglish(_ text: String) -> [String] {
        let chars = Array(text)
        var out: [String] = []
        var start = 0
        var i = 0
        while i < chars.count {
            guard englishTerminators.contains(chars[i]) else { i += 1; continue }
            let termStart = i
            var onlyPeriods = true
            while i < chars.count, englishTerminators.contains(chars[i]) {
                if chars[i] != "." { onlyPeriods = false }
                i += 1
            }
            while i < chars.count, englishClosers.contains(chars[i]) { i += 1 }
            let atBoundary = i >= chars.count || chars[i].isWhitespace
            guard atBoundary else { continue }
            if onlyPeriods {
                // Look at the word before the period.
                var w = termStart
                while w > start, !chars[w - 1].isWhitespace { w -= 1 }
                let word = String(chars[w..<termStart]).lowercased()
                let isInitial = word.count == 1 && word.first!.isLetter
                    || (word.count >= 3 && word.split(separator: ".").allSatisfy { $0.count == 1 && $0.first!.isLetter })
                if englishAbbreviations.contains(word) || isInitial { continue }
            }
            out.append(String(chars[start..<i]))
            start = i
        }
        if start < chars.count { out.append(String(chars[start...])) }
        return out
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    /// Merge `longer` into `shorter.count` consecutive groups whose cumulative
    /// character share tracks `shorter`'s, so the two sides can be paired 1:1.
    /// Monotonic and bounded to the line it's called on.
    private static func groupByLengthShare(_ longer: [String], _ shorter: [String], joiner: String) -> [String] {
        let longTotal = max(1, longer.reduce(0) { $0 + $1.count })
        let shortTotal = max(1, shorter.reduce(0) { $0 + $1.count })
        var groups: [String] = []
        var li = 0
        var shortCum = 0
        var longCum = 0

        for si in 0..<shorter.count {
            shortCum += shorter[si].count
            let target = Double(shortCum) / Double(shortTotal)
            let remainingGroups = shorter.count - si - 1
            var group = [longer[li]]
            longCum += longer[li].count
            li += 1
            // Keep absorbing while the next item's midpoint still falls before the
            // target share, leaving at least one item per remaining group.
            while li < longer.count - remainingGroups {
                let mid = (Double(longCum) + Double(longer[li].count) / 2) / Double(longTotal)
                if mid >= target { break }
                group.append(longer[li])
                longCum += longer[li].count
                li += 1
            }
            groups.append(group.joined(separator: joiner))
        }
        // The last group absorbs anything left.
        if li < longer.count, !groups.isEmpty {
            groups[groups.count - 1] = ([groups[groups.count - 1]] + longer[li...]).joined(separator: joiner)
        }
        return groups
    }

    /// Pair one line's Chinese and English sentences. Equal counts pair 1:1;
    /// otherwise the longer side is merged down to the shorter by length share.
    private static func pairLine(chinese: String, english: String) -> [(String, String)] {
        let zh = splitChinese(chinese)
        let en = splitEnglish(english)
        if zh.isEmpty || en.isEmpty { return [(chinese, english)] }
        if zh.count == en.count { return Array(zip(zh, en)) }
        if zh.count > en.count { return Array(zip(groupByLengthShare(zh, en, joiner: ""), en)) }
        return Array(zip(zh, groupByLengthShare(en, zh, joiner: " ")))
    }

    /// `original[i]` and `translated[i]` are already a matched pair (the API
    /// translates line by line), so pairing happens *within* each line.
    /// Re-splitting the whole article and pairing by global index let a single
    /// stray split ("Dr.", a decimal, an LLM merging two sentences) shift every
    /// block after it by one.
    ///
    /// Within a line, sentences pair 1:1 when both sides agree on the count, and
    /// otherwise the longer side is merged down by length share — so any
    /// residual drift stays inside its own paragraph.
    static func process(original: [String], translated: [String]) -> [SentencePair] {
        var pairs: [SentencePair] = []
        for i in 0..<min(original.count, translated.count) {
            let english = original[i].trimmingCharacters(in: .whitespacesAndNewlines)
            let chinese = translated[i].trimmingCharacters(in: .whitespacesAndNewlines)
            if english.isEmpty && chinese.isEmpty { continue }
            for (c, e) in pairLine(chinese: chinese, english: english) {
                pairs.append(SentencePair(index: pairs.count, chinese: c, english: e))
            }
        }
        return pairs
    }
}
