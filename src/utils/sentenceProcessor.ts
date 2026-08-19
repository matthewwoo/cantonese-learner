/**
 * Sentence Processor for Reading Sessions
 * Splits articles into sentence cards for Duolingo-style reading
 */

export interface SentenceCard {
  chinese: string;
  english: string;
  audioUrl?: string;
  cardIndex: number;
}

export interface ProcessedArticle {
  sentences: SentenceCard[];
  sentenceCount: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
}

/**
 * Split Chinese text into sentences using punctuation.
 * A sentence ends at 。！？； plus any closing quotes/brackets that follow.
 */
export function splitChineseIntoSentences(chineseText: string): string[] {
  const sentences = (chineseText.match(/[^。！？；]+[。！？；]*[」』”’）》〉]*/g) ?? [])
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0);
  
  return sentences;
}

// Tokens that end in "." without ending a sentence. Single capital letters
// (initials, "U.S.") are handled separately.
const ENGLISH_ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'mt', 'vs', 'etc', 'no',
  'inc', 'ltd', 'co', 'corp', 'fig', 'approx', 'gov', 'sen', 'rep', 'gen',
  'col', 'capt', 'lt', 'sgt', 'hon', 'rev', 'jan', 'feb', 'mar', 'apr', 'jun',
  'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'e.g', 'i.e', 'u.s', 'u.k',
]);

/**
 * Split English text into sentences.
 *
 * A boundary is a run of .!?; (plus closing quotes/brackets) followed by
 * whitespace or end of text — so decimals ("3.5"), URLs and "e.g." mid-word
 * never split — and not preceded by a known abbreviation or a single-letter
 * initial ("Dr.", "J. Smith", "U.S.").
 */
export function splitEnglishIntoSentences(englishText: string): string[] {
  const sentences: string[] = [];
  const boundary = /[.!?;]+["'”’)\]]*(?=\s|$)/g;
  let start = 0;
  let match: RegExpExecArray | null;

  while ((match = boundary.exec(englishText)) !== null) {
    const end = match.index + match[0].length;
    if (match[0].startsWith('.') && !match[0].includes('!') && !match[0].includes('?')) {
      // Look at the word before the period.
      const before = englishText.slice(start, match.index);
      const word = (before.match(/(\S+)$/)?.[1] ?? '').toLowerCase();
      const isInitial = /^[a-z]$/.test(word) || /^(?:[a-z]\.)+[a-z]$/.test(word);
      if (ENGLISH_ABBREVIATIONS.has(word) || isInitial) {
        continue;
      }
    }
    sentences.push(englishText.slice(start, end));
    start = end;
  }
  if (start < englishText.length) sentences.push(englishText.slice(start));

  return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Merge `longer` into `shorter.length` consecutive groups whose cumulative
 * character share tracks `shorter`'s, so the two sides can be paired 1:1.
 * Monotonic and bounded to the line it's called on.
 */
function groupByLengthShare(longer: string[], shorter: string[], joiner: string): string[] {
  const total = (xs: string[]) => xs.reduce((n, x) => n + x.length, 0);
  const longTotal = total(longer) || 1;
  const shortTotal = total(shorter) || 1;
  const groups: string[] = [];
  let li = 0;
  let shortCum = 0;
  let longCum = 0;

  for (let si = 0; si < shorter.length; si++) {
    shortCum += shorter[si].length;
    const target = shortCum / shortTotal;
    const remainingGroups = shorter.length - si - 1;
    const group = [longer[li]];
    longCum += longer[li].length;
    li++;
    // Keep absorbing while the next item's midpoint still falls before the
    // target share, leaving at least one item per remaining group.
    while (li < longer.length - remainingGroups) {
      const mid = (longCum + longer[li].length / 2) / longTotal;
      if (mid >= target) break;
      group.push(longer[li]);
      longCum += longer[li].length;
      li++;
    }
    groups.push(group.join(joiner));
  }
  // The last group absorbs anything left.
  if (li < longer.length) {
    groups[groups.length - 1] = [groups[groups.length - 1], ...longer.slice(li)].join(joiner);
  }
  return groups;
}

/**
 * Pair one line's Chinese and English sentences. Equal counts pair 1:1;
 * otherwise the longer side is merged down to the shorter by length share.
 */
function pairLine(chinese: string, english: string): { chinese: string; english: string }[] {
  const zh = splitChineseIntoSentences(chinese);
  const en = splitEnglishIntoSentences(english);
  if (zh.length === 0 || en.length === 0) return [{ chinese, english }];
  if (zh.length === en.length) return zh.map((c, j) => ({ chinese: c, english: en[j] }));
  if (zh.length > en.length) {
    const merged = groupByLengthShare(zh, en, '');
    return merged.map((c, j) => ({ chinese: c, english: en[j] }));
  }
  const merged = groupByLengthShare(en, zh, ' ');
  return zh.map((c, j) => ({ chinese: c, english: merged[j] }));
}

/**
 * Process article content into sentence cards.
 *
 * `originalContent[i]` and `translatedContent[i]` are already a matched pair
 * (the API translates the article line by line), so pairing happens *within*
 * each line. Re-splitting the whole article and pairing by global index let a
 * single stray split (an abbreviation like "Dr.", a decimal, an LLM merging
 * two sentences) shift every card after it by one.
 *
 * Within a line, sentences pair 1:1 when both sides agree on the count, and
 * otherwise the longer side is merged down by length share — so any residual
 * drift stays inside its own paragraph.
 */
export function processArticleIntoSentences(
  originalContent: string[],
  translatedContent: string[]
): ProcessedArticle {
  const sentences: SentenceCard[] = [];
  const lineCount = Math.min(originalContent.length, translatedContent.length);

  for (let i = 0; i < lineCount; i++) {
    const english = originalContent[i].trim();
    const chinese = translatedContent[i].trim();
    if (!chinese && !english) continue;

    for (const pair of pairLine(chinese, english)) {
      sentences.push({ ...pair, cardIndex: sentences.length });
    }
  }
  
  // Calculate difficulty based on sentence length and complexity
  const difficulty = calculateDifficulty(sentences);
  
  // Estimate reading time (assuming 2-3 seconds per sentence)
  const estimatedMinutes = Math.ceil(sentences.length * 2.5 / 60);
  
  return {
    sentences,
    sentenceCount: sentences.length,
    difficulty,
    estimatedMinutes,
  };
}

/**
 * Calculate article difficulty based on sentence characteristics
 */
function calculateDifficulty(sentences: SentenceCard[]): 'beginner' | 'intermediate' | 'advanced' {
  if (sentences.length === 0) return 'beginner';
  
  // Calculate average sentence length
  const avgChineseLength = sentences.reduce((sum, sentence) => 
    sum + sentence.chinese.length, 0) / sentences.length;
  
  const avgEnglishLength = sentences.reduce((sum, sentence) => 
    sum + sentence.english.split(' ').length, 0) / sentences.length;
  
  // Count complex characters (characters with more strokes or less common)
  const complexCharCount = sentences.reduce((sum, sentence) => {
    return sum + sentence.chinese.split('').filter(char => {
      // Simple heuristic: characters that are less common
      const commonChars = '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转单风切打白教速花带安场身车例真务具万每目至达走积示议声报斗完类八离华名确才科张信马节话米整空元况今集温传土许步群广石记需段研界拉林律叫且究观越织装影算低持音众书布复容儿须际商非验连断深难近矿千周委素技备半办青省列习响约支般史感劳便团往酸历市克何除消构府称太准精值号率族维划选标写存候毛亲快效斯院查江型眼王按格养易置派层片始却专状育厂京识适属圆包火住调满县局照参红细引听该铁价严龙飞';
      return !commonChars.includes(char);
    }).length;
  }, 0);
  
  const avgComplexChars = complexCharCount / sentences.length;
  
  // Determine difficulty based on metrics
  if (avgChineseLength <= 15 && avgEnglishLength <= 8 && avgComplexChars <= 2) {
    return 'beginner';
  } else if (avgChineseLength <= 25 && avgEnglishLength <= 12 && avgComplexChars <= 4) {
    return 'intermediate';
  } else {
    return 'advanced';
  }
}

/**
 * Validate sentence cards
 */
export function validateSentenceCards(sentences: SentenceCard[]): boolean {
  if (!Array.isArray(sentences) || sentences.length === 0) {
    return false;
  }
  
  return sentences.every((sentence, index) => {
    return (
      typeof sentence.chinese === 'string' &&
      typeof sentence.english === 'string' &&
      sentence.chinese.trim().length > 0 &&
      sentence.english.trim().length > 0 &&
      sentence.cardIndex === index
    );
  });
}

/**
 * Get sentence statistics for analytics
 */
export function getSentenceStats(sentences: SentenceCard[]) {
  const totalChars = sentences.reduce((sum, sentence) => 
    sum + sentence.chinese.length, 0);
  const totalWords = sentences.reduce((sum, sentence) => 
    sum + sentence.english.split(' ').length, 0);
  
  return {
    totalSentences: sentences.length,
    averageChineseLength: Math.round(totalChars / sentences.length),
    averageEnglishLength: Math.round(totalWords / sentences.length),
    totalReadingTime: Math.ceil(sentences.length * 2.5), // seconds
  };
}
