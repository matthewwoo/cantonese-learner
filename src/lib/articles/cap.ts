/**
 * Maximum article length (in characters) returned from the URL scraper.
 * Anything past this is dropped at a paragraph boundary and `truncated: true`
 * is set on the response so clients can tell the user.
 */
export const MAX_ARTICLE_CHARS = 50_000;

/**
 * Join paragraphs with blank lines, keeping whole paragraphs until adding the
 * next one would push the total past `maxChars`. Cutting at a paragraph
 * boundary (rather than mid-sentence) keeps the downstream sentence/translation
 * alignment intact. Always keeps at least the first paragraph.
 */
export function capParagraphs(
  paragraphs: string[],
  maxChars: number = MAX_ARTICLE_CHARS
): { content: string; truncated: boolean } {
  const kept: string[] = [];
  let total = 0;
  for (const p of paragraphs) {
    const added = p.length + (kept.length > 0 ? 2 : 0); // "\n\n" separator
    if (kept.length > 0 && total + added > maxChars) {
      return { content: kept.join('\n\n'), truncated: true };
    }
    kept.push(p);
    total += added;
  }
  return { content: kept.join('\n\n'), truncated: false };
}
