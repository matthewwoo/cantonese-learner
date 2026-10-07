# Cantonese Learner — iOS (SwiftUI)

Native iOS client for the Cantonese Learner app. It talks to the **same Supabase
project** (auth + tables, protected by RLS) as the web app, and calls the deployed
Next.js **`/api/*` routes** for everything that needs server-side secrets (AI chat,
Whisper STT, MiniMax TTS, translation, deck/article generation) using
`Authorization: Bearer <supabase access token>`.

```
ios/
├── project.yml                  # XcodeGen spec → CantoneseLearner.xcodeproj
├── Config/
│   ├── Secrets.example.xcconfig # copy → Secrets.xcconfig (git-ignored)
│   └── Secrets.xcconfig         # SUPABASE_URL / SUPABASE_ANON_KEY / API_BASE_URL
└── CantoneseLearner/
    ├── Sources/
    │   ├── App/        # @main, RootView (auth gate), AppConfig (Info.plist → Swift)
    │   ├── Core/       # Supabase client, SessionStore, Models, Repositories,
    │   │               # SM2, PracticeDays, SentenceProcessor, APIClient,
    │   │               # SpeechService (TTS), VoiceRecorder (STT capture)
    │   ├── UI/         # Theme: color tokens, button/input styles, toasts, shimmer
    │   └── Features/   # Shell (tab bar + header), Auth, Home, Flashcards
    │                   # (list / create / detail / study), Chat, Articles
    └── Resources/Assets.xcassets   # AppIcon, HeaderLogo, AppLogo, Tab* icons
├── Shared/                      # Compiled into app + extension (App Group queue)
└── ShareExtension/              # "Cantonese" in the iOS share sheet → queues a
                                 # page URL and deep-links to the new-read form
```

Both targets join the App Group `group.com.matthewwoo.CantoneseLearner`; it must
exist on the App ID in the developer portal (Xcode's automatic signing adds it).

## Setup

1. Install [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`) — Xcode 16+.
2. Create the secrets file:
   ```bash
   cp ios/Config/Secrets.example.xcconfig ios/Config/Secrets.xcconfig
   ```
   and fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY` (same values as
   `NEXT_PUBLIC_SUPABASE_*` in `.env.local`) and `API_BASE_URL` (the deployed
   web app, default `https://cantonese-learner.vercel.app`).
   > `//` starts a comment in xcconfig, so URLs are written as `https:/$()/host`.
3. Generate and open the project (the `.xcodeproj` is generated from
   `project.yml` — re-run `xcodegen generate` whenever you add/remove source files):
   ```bash
   cd ios && xcodegen generate && open CantoneseLearner.xcodeproj
   ```
4. Set your Team under *Signing & Capabilities* (or `DEVELOPMENT_TEAM` in
   `project.yml`) to run on a device, then ⌘R.

Swift Package dependency: [`supabase-swift`](https://github.com/supabase/supabase-swift) (resolved automatically).

### Running in the simulator from the command line

Start the web API with `npm run dev` in `cantonese-app/`, boot an iPhone simulator,
then run the following from `ios/` (replace `iPhone 17` with your simulator's name):

```bash
xcodebuild -project CantoneseLearner.xcodeproj -scheme CantoneseLearner \
  -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17' \
  -derivedDataPath /tmp/cantonese-learner-ios-build \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- \
  'API_BASE_URL=http:/$()/127.0.0.1:3000' build
xcrun simctl install booted /tmp/cantonese-learner-ios-build/Build/Products/Debug-iphonesimulator/CantoneseLearner.app
xcrun simctl launch booted com.matthewwoo.CantoneseLearner
```

Keep code signing enabled even for simulator builds. Supabase stores its session
in the Keychain, which requires the app's signing entitlements. Disabling signing
can make sign-in appear successful while chat fails with `Auth session missing.`
If that happens, rebuild with signing enabled and sign in again; the unsigned
build could not save the session.

## How it maps to the web app

| Web | iOS |
|---|---|
| `src/lib/supabase/client.ts` | `Core/SupabaseClient.swift` (+ robust ISO-8601 date decoding) |
| `src/lib/supabase/use-user.ts` | `Core/SessionStore.swift` (`authStateChanges` stream) |
| `src/lib/data/{flashcards,study,articles,stats}.ts` | `Core/Repositories.swift` — same PostgREST queries |
| `src/lib/srs/sm2.ts` | `Core/SM2.swift` (line-for-line) |
| `src/lib/activity/practice-days.ts` | `Core/PracticeDays.swift` (local-day keys, Monday-first week, streak) |
| `src/lib/generation.ts` (10-min pending timeout, 4 s polling) | `GenerationStatus.display` + list models' `pollTask` |
| `src/utils/sentenceProcessor.ts` | `Core/SentenceProcessor.swift` |
| `src/utils/textToSpeech.ts` | `Core/SpeechService.swift` — server MP3 via `/api/speech/tts`, `AVSpeechSynthesizer` zh-HK fallback, generation-token cancellation |
| `src/utils/openaiSpeechToText.ts` | `Core/VoiceRecorder.swift` (16 kHz mono AAC) + `APIClient.transcribe` (`audioType: audio/mp4`) |
| `/api/*` fetches | `Core/APIClient.swift` (Bearer JWT) |
| `globals.css` tokens, `ui/button.tsx`, … | `UI/Theme.swift` |
| `bottom-nav.tsx`, `top-header.tsx` | `Features/Shell/MainTabView.swift` |
| `/dashboard` (`activity-week`, `stat-carousel`) | `Features/Home/HomeView.swift` |
| `/flashcards`, `UploadForm`, `/flashcards/set/[id]` | `Features/Flashcards/DeckListView.swift`, `CreateDeckView.swift` |
| `/flashcards/study/[setId]`, `QuestionCard` | `Features/Flashcards/StudyView.swift` |
| `/chat`, `ChatMessage`, `VoicePill` | `Features/Chat/ChatView.swift` |
| `/articles`, `/articles/new`, `/articles/[id]`, audio player | `Features/Articles/*.swift` |

Behavioural parity notes:
- Study sessions pick 15 cards (due-first, Fisher–Yates for ties), seed SM-2 state
  from the latest `study_cards` row and write `study_sessions` / `study_cards`
  exactly like the web client. Ratings map to quality 0–4; `wasCorrect = q ≥ 3`.
- Chat is voice-only (tap to start/stop, 15 s auto-stop). Bubbles: tap = TTS,
  swipe left = English (lazy `/api/translate`), swipe right = Chinese. Assistant
  replies auto-play. History is not restored (same as web).
- Article reader renders sentence pairs as bubbles; tap a bubble to read from
  there; the bottom bar has play/pause, scrub, time and playback-speed menu.
  Reading progress (`reading_sessions.current_position`) is saved every 5 s and
  on leave, and only moves forward.
- Deck/article creation posts to `/api/flashcards/generate` / `/api/articles`
  and the lists poll every 4 s while rows are `pending`.
- **Read → Add via camera** accepts up to 10 photos, numbered in selection
  order. Select book pages in reading order. OCR retains the printed source
  text; creation translates each photographed page as a complete passage so
  verse lines retain their context. The confirmation form shows each photo with
  its editable source text. The reader shows the photo above its translation;
  swipe horizontally or tap Previous/Next to turn pages. The title and audio
  bar stay in place, playback follows the current page, and original text has
  its own toggle. The combined image upload still has a size limit.

  New photo reads retain bounded JPEG data alongside each page's source text
  in `articles.original_content` (`{text,image}[]`); text/link reads keep their
  existing `string[]` format. Both formats decode in the native reader and the
  web text mapper. Photos have the same owner-only RLS protection as the article
  and are removed with it. No database migration is required. Older imports
  discarded photos and need to be imported again to use the photo reader.

Book-import regression checks (from `cantonese-app/`):

```bash
node --test tests/*.test.cjs
swiftc -module-cache-path /tmp/cantonese-swift-module-cache \
  ios/CantoneseLearner/Sources/Core/Models.swift tests/main.swift \
  -o /tmp/cantonese-article-model-tests
/tmp/cantonese-article-model-tests
```

## Web-side change required

`src/lib/supabase/middleware.ts` now lets `/api/*` through without a cookie
session (each route does its own `getUser()` and returns 401). Before this,
Bearer-only requests from the native app were 307-redirected to `/auth/signin`.
Deploy the web app for the iOS client to work against production.

## Debug flags (DEBUG builds only)

- `--ui-preview` — render the signed-in shell without a session (empty states).
- `--ui-preview-card` — render the study card, chat bubbles and player bar.
- `--ui-preview-book` — open the real photo reader using a local
  `Documents/book-reader-fixture.json` (`title`, `pages: [{text,image}]`,
  `translations: [string]`). Page and translation counts must match. This
  preview performs no OCR, article creation, or progress writes.

```bash
xcrun simctl launch booted com.matthewwoo.CantoneseLearner --ui-preview
```

## Not yet ported / follow-ups

- Email confirmation deep link uses the `cantonese://auth/callback` URL scheme —
  add that URL to *Authentication → URL Configuration → Redirect URLs* in the
  Supabase dashboard if email confirmation is enabled.
- Word-definition dialog in the reader (dead code on web too).
- Inter font isn't bundled (system SF Pro is used); add `Inter-*.ttf` +
  `UIAppFonts` if pixel parity matters.
- App Store metadata / screenshots, push notifications, offline caching.
