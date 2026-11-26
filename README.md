# SpotMusic: Phases 2 to 4 (accounts, catalog, streaming, player)

Ad-free music app. There are no ads, ad SDKs or ad trackers anywhere in this code, and none should be added.

```
backend/   NestJS + PostgreSQL API (auth, catalog, search, audio streaming)
app/       Flutter app (sign-in, Home, Search, Album, mini + full player, Profile)
```

## What works (once it builds)

- Sign up, log in, Google / Apple sign-in, password reset, multi-device sessions, export and delete account.
- A catalog of artists, albums and tracks with a required rights record per track.
- Search across songs, albums and artists.
- Audio streaming with byte-range support (seeking and buffering) behind a streaming-only token.
- Player: play/pause, next/previous, seek, shuffle, repeat, playback speed, queue per album/search/home list,
  mini-player, full-screen player, background playback with lock-screen and Bluetooth/headphone controls.

## Status: read this first

All of this is written but **has not been built or run end to end**. The build environment had no network, so
`npm install` and `flutter pub get` never ran, and there is no Flutter SDK here. What was actually executed:
password hashing, the byte-range parser and the WAV generator (all passed, and the generated WAV was
confirmed by ffprobe as valid 22.05 kHz mono PCM). Everything else, including the Flutter code, is unrun.
Expect some compile errors to fix on the first build. Tests: `npm test` in `backend/` (3 spec files).

## Run the backend

```bash
cd backend
docker compose up -d                 # PostgreSQL
cp .env.example .env                 # set JWT_ACCESS_SECRET (32+ chars)
npm install
npm run seed                         # creates a small dev catalog + generated audio
npm run start:dev                    # http://localhost:3000
npm test
```

The seed catalog is **synthesised tone melodies** (original, CC0, recorded in each track's licence fields). It exists
only so the player can be tested with audio nobody owns. It is not real music.

## Run the app

Needs Flutter 3.27 or newer.

```bash
cd app
flutter create . --platforms=android,ios
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

`10.0.2.2` reaches your computer from the Android emulator; use `http://localhost:3000` on the iOS simulator.

### Platform setup for background playback (required, not automatic)

**Android**, in `android/app/src/main/AndroidManifest.xml`:
1. Add inside `<manifest>`: `WAKE_LOCK`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `INTERNET` permissions.
2. Change the main activity to `com.ryanheise.audioservice.AudioServiceActivity` (and make `MainActivity.kt` extend it).
3. Add inside `<application>` the `com.ryanheise.audioservice.AudioService` service (with `foregroundServiceType="mediaPlayback"`) and the `MediaButtonReceiver`, as shown in the just_audio_background README.
4. For local development over plain HTTP, add `android:usesCleartextTraffic="true"` to `<application>`. Remove it for release; production must use HTTPS.

**iOS**, in `ios/Runner/Info.plist`: add `UIBackgroundModes` with `audio`.

## Get an APK without installing anything (GitHub)

1. Create a free GitHub account and a new **private** repository. Upload the contents of this folder (the `.github` folder must be included).
2. Open the repository's **Actions** tab, choose **Build Android APK**, click **Run workflow**, and enter your backend address (for example `http://192.168.1.20:3000`, or `https://api.yourdomain.com` once hosted).
3. After a few minutes, open the finished run and download the **spotmusic-apk** artifact. Unzip it to get `app-release.apk`.
4. Send the APK to your phone, open it, and allow "install unknown apps" when asked.

`tool/patch_android.py` applies the background-audio settings automatically in this build. The workflow has not been run yet, so the first run may need a fix; paste any error from the Actions log. The APK is signed with a debug key, which is fine for demos but not for the Play Store. The backend must still be running and reachable from the phone.

## API

| Method and path | Purpose |
|---|---|
| POST `/auth/register`, `/auth/login`, `/auth/google`, `/auth/apple` | sign in |
| POST `/auth/refresh`, `/auth/logout`, `/auth/logout-all` | sessions |
| POST `/auth/forgot-password`, `/auth/reset-password` | emailed 30-minute link |
| GET, PATCH `/users/me`; POST `/users/me/password`; GET, DELETE `/users/me/devices` | profile, devices |
| GET `/users/me/export`; DELETE `/users/me` | data export, account deletion |
| GET `/catalog/home`, `/catalog/albums/:id`, `/catalog/artists/:id` | browse |
| GET `/catalog/search?q=` | search songs, albums, artists |
| GET `/catalog/stream-token` | 12-hour token that works only for streaming |
| GET `/tracks/:id/stream?t=` | audio with `Range` support (200, 206, 416) |

## Security decisions

- Passwords: scrypt with per-password salt. Access tokens 15 min; refresh tokens random, stored hashed, rotated, reuse revokes the device.
- Streaming uses a separate scoped token. It cannot call any other endpoint, and normal login tokens cannot stream-bypass it.
- Tracks switched off (`available = false`) cannot be streamed or listed. Storage keys never leave the server and cannot escape the storage folder.
- Rate limits and input validation on all endpoints; credential endpoints are tighter.

## Integrations and gaps (nothing here is faked)

- **Real music**: none included. Use music you hold rights to. The rights fields (`rightsHolder`, `licenseType`) are required for every track. Until the admin dashboard exists, add tracks through the seed script or direct database inserts.
- **Audio storage**: local disk (`StorageService`). For production, implement the same two methods (`put`, `get`) for S3/R2/GCS and put a CDN in front. Streaming is direct file bytes, not HLS/DASH yet.
- **Not built yet**: Library and playlists, likes, downloads and offline (with licence expiry), lyrics, podcasts and radio, recommendations and AI features, equalizer/crossfade/gapless tuning, sleep timer, admin dashboard, social features, tablet/desktop layouts, email verification, profile pictures, fuzzy search and voice search, analytics, backups.
- **Email, Google, Apple, reset deep link**: as in Phase 2; see `.env.example`.
- **Production database**: add migrations before deploying (`synchronize` is off in production).
- Library and Radio tabs from the design are left out of the navigation until they work.

## Next

Phase 6 (playlists, likes, library) is the next most valuable step, then offline downloads, then the admin dashboard so real licensed content can be added.
