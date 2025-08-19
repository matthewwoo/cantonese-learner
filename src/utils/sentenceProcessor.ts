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
 * Split Chinese text into sentences using punctuation
 */
export function splitChineseIntoSentences(chineseText: string): string[] {
  // Chinese sentence endings: 。！？； (period, exclamation, question mark, semicolon)
  const sentenceEndings = /[。！？；]/g;
  
  // Split by sentence endings and filter out empty strings
  const sentences = chineseText
    .split(sentenceEndings)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0);
  
  return sentences;
}

/**
 * Split English text into sentences
 */
export function splitEnglishIntoSentences(englishText: string): string[] {
  // English sentence endings: . ! ? ;
  const sentenceEndings = /[.!?;]/g;
  
  // Split by sentence endings and filter out empty strings
  const sentences = englishText
    .split(sentenceEndings)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0);
  
  return sentences;
}

/**
 * Process article content into sentence cards
 */
export function processArticleIntoSentences(
  originalContent: string[],
  translatedContent: string[]
): ProcessedArticle {
  // Combine all paragraphs into single text
  const fullChineseText = translatedContent.join('\n');
  const fullEnglishText = originalContent.join('\n');
  
  // Split into sentences
  const chineseSentences = splitChineseIntoSentences(fullChineseText);
  const englishSentences = splitEnglishIntoSentences(fullEnglishText);
  
  // Create sentence cards
  const sentences: SentenceCard[] = [];
  const maxSentences = Math.min(chineseSentences.length, englishSentences.length);
  
  for (let i = 0; i < maxSentences; i++) {
    sentences.push({
      chinese: chineseSentences[i],
      english: englishSentences[i],
      cardIndex: i,
    });
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
