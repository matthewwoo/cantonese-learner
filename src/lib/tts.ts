/**
 * Shared text-to-speech tuning.
 *
 * Lives in `lib/` rather than `utils/textToSpeech.ts` so the article audio
 * player can import it without pulling in the Web Speech service: the player
 * talks to /api/speech/tts directly and only needs the number.
 */

/**
 * Playback speed for Cantonese synthesis, as a multiplier of natural pace.
 *
 * 1.0 = the voice's natural delivery. Change this one value to retune every
 * surface at once — the article read-aloud bar, tapping a bubble, the word
 * dialog, chat, and flashcards all resolve their speed from here.
 *
 * Applied at *synthesis* time (Fish `prosody.speed`), which re-voices the line
 * properly. That is not the same as the player's speed control, which sets
 * <audio>.playbackRate and merely resamples finished audio — so prefer changing
 * this constant over reaching for playbackRate if the pace ever needs to move.
 */
export const CANTONESE_TTS_SPEED = 1.0
