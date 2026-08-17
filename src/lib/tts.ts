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
 * Deliberately below 1.0 — learners need time to catch tones and word
 * boundaries. Applied at *synthesis* time (Fish `prosody.speed`, Azure SSML
 * `<prosody rate>`), which re-voices the line properly, rather than as an
 * <audio> playbackRate, which just resamples finished audio and sounds
 * slowed-down.
 *
 * The API itself still defaults to 1.0 — that endpoint stays general-purpose,
 * and this is the app's choice, made in one place.
 */
export const CANTONESE_TTS_SPEED = 0.75
