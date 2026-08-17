// src/lib/flashcards/csv.ts
// One CSV parser for both flashcard entry points: user uploads and AI
// generation. It matches headers loosely, honours RFC 4180 quoting so commas
// inside fields survive, and skips unusable rows instead of discarding the
// whole file — a single bad row should never cost a 100-card deck.

import type { NewFlashcard } from '@/lib/data/types'

/** The header the AI is prompted for, and what the sample download uses. */
export const FLASHCARD_CSV_HEADER =
  'Chinese Word,English Translation,Pronunciation,Example Sentence (English),Example Sentence (Chinese)'

export interface SkippedRow {
  line: number // 1-based line number in the source text
  reason: string
}

export interface ParsedFlashcardCsv {
  flashcards: NewFlashcard[]
  skipped: SkippedRow[]
}

interface CsvRow {
  fields: string[]
  line: number
}

/** Models like to wrap CSV in ```csv fences even when told not to. */
function stripCodeFences(text: string): string {
  return text
    .replace(/^\s*```[a-zA-Z]*\s*\n?/, '')
    .replace(/\n?\s*```\s*$/, '')
    .trim()
}

/**
 * RFC 4180 tokenizer. Handles quoted fields (including embedded commas,
 * newlines and doubled "" escapes) and both LF and CRLF line endings.
 */
function parseCsvRows(text: string): CsvRow[] {
  const rows: CsvRow[] = []
  let fields: string[] = []
  let field = ''
  let inQuotes = false
  let line = 1
  let rowStartLine = 1
  let sawContent = false

  const endRow = () => {
    fields.push(field)
    field = ''
    // Drop rows that are entirely blank (trailing newlines, separator lines)
    if (sawContent) rows.push({ fields, line: rowStartLine })
    fields = []
    sawContent = false
    rowStartLine = line
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        if (ch === '\n') line++
        field += ch
      }
      sawContent = true
      continue
    }

    if (ch === '"') {
      inQuotes = true
      sawContent = true
    } else if (ch === ',') {
      fields.push(field)
      field = ''
    } else if (ch === '\r') {
      // swallow: CRLF is handled by the \n branch
    } else if (ch === '\n') {
      line++
      endRow()
    } else {
      field += ch
      if (ch.trim()) sawContent = true
    }
  }
  endRow() // flush the final row, which may lack a trailing newline

  return rows
}

interface ColumnMap {
  chineseWord: number
  englishTranslation: number
  pronunciation: number
  exampleSentenceEnglish: number
  exampleSentenceChinese: number
}

/**
 * Map header cells to our five fields by keyword. The example-sentence columns
 * are claimed first: they contain the words "chinese"/"english" too, so
 * matching them last would let them swallow the word/translation columns.
 */
function resolveColumns(headerFields: string[]): ColumnMap | null {
  const cols = headerFields.map((f) => f.trim().toLowerCase())
  const taken = new Set<number>()

  const pick = (predicate: (col: string) => boolean): number => {
    const i = cols.findIndex((col, idx) => !taken.has(idx) && predicate(col))
    if (i !== -1) taken.add(i)
    return i
  }

  const isExample = (c: string) =>
    c.includes('example') || c.includes('sentence') || c.includes('例句')

  const exampleSentenceEnglish = pick(
    (c) => isExample(c) && (c.includes('english') || c.includes('英'))
  )
  const exampleSentenceChinese = pick(
    (c) =>
      isExample(c) &&
      (c.includes('chinese') || c.includes('中') || c.includes('例句'))
  )
  const pronunciation = pick(
    (c) =>
      c.includes('pronunciation') ||
      c.includes('jyutping') ||
      c.includes('romanization') ||
      c.includes('拼音')
  )
  const chineseWord = pick(
    (c) =>
      c.includes('chinese') ||
      c.includes('traditional') ||
      c.includes('word') ||
      c.includes('中文')
  )
  const englishTranslation = pick(
    (c) =>
      c.includes('english') ||
      c.includes('translation') ||
      c.includes('meaning') ||
      c.includes('英文')
  )

  if (chineseWord === -1 || englishTranslation === -1) return null

  return {
    chineseWord,
    englishTranslation,
    pronunciation,
    exampleSentenceEnglish,
    exampleSentenceChinese,
  }
}

/**
 * Parse flashcard CSV. Throws only when the input is unusable as a whole (no
 * rows, or no recognisable Chinese/English columns); individual bad rows are
 * reported in `skipped` so the caller can surface a count and still save the
 * rest.
 */
export function parseFlashcardCsv(input: string): ParsedFlashcardCsv {
  const rows = parseCsvRows(stripCodeFences(input))

  if (rows.length === 0) {
    throw new Error('The CSV is empty.')
  }
  if (rows.length < 2) {
    throw new Error('The CSV needs a header row and at least one card row.')
  }

  const [headerRow, ...dataRows] = rows
  const columns = resolveColumns(headerRow.fields)
  if (!columns) {
    throw new Error(
      'Could not find the Chinese word and English translation columns. ' +
        `Expected a header like: ${FLASHCARD_CSV_HEADER}`
    )
  }

  const columnCount = headerRow.fields.length
  const flashcards: NewFlashcard[] = []
  const skipped: SkippedRow[] = []

  for (const row of dataRows) {
    // More fields than the header means an unquoted comma shifted the columns.
    // We can't tell which field it came from, so the row is unrecoverable —
    // skipping is honest, whereas re-joining would silently misalign the card.
    if (row.fields.length > columnCount) {
      skipped.push({
        line: row.line,
        reason: `expected ${columnCount} columns but found ${row.fields.length} (unquoted comma?)`,
      })
      continue
    }

    // Fewer fields is fine — the trailing optional columns are just absent.
    const value = (index: number) =>
      index === -1 ? '' : (row.fields[index] ?? '').trim()

    const chineseWord = value(columns.chineseWord)
    const englishTranslation = value(columns.englishTranslation)
    if (!chineseWord || !englishTranslation) {
      skipped.push({
        line: row.line,
        reason: 'missing Chinese word or English translation',
      })
      continue
    }

    flashcards.push({
      chineseWord,
      englishTranslation,
      pronunciation: value(columns.pronunciation) || null,
      exampleSentenceEnglish: value(columns.exampleSentenceEnglish) || null,
      exampleSentenceChinese: value(columns.exampleSentenceChinese) || null,
    })
  }

  if (flashcards.length === 0) {
    throw new Error('No usable flashcards were found in the CSV.')
  }

  return { flashcards, skipped }
}

/** Drop cards whose Chinese word already appeared. Order is preserved. */
export function deduplicateFlashcards(cards: NewFlashcard[]): NewFlashcard[] {
  const seen = new Set<string>()
  return cards.filter((card) => {
    const key = card.chineseWord.trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
