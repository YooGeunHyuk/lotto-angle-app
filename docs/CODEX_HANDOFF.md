# LottoAnalyzer Codex Handoff

Last updated: 2026-05-02

## Purpose

This file is the short handoff context for continuing work in a fresh Codex thread without re-compressing the full conversation.

Recommended next-thread prompt:

`Read /Users/straynurbs/dev/LottoAnalyzer-copy/docs/CODEX_HANDOFF.md first and continue from there.`

## Product Summary

- App name: `로또될각`
- Stack: Expo + React Native + Expo Router
- Platforms: iOS + Android
- Core concept:
  - Lotto number recommendation
  - Fixed-number recommendation
  - Sum-range generation
  - Statistics
  - Remote draw data sync

## Important Current Direction

The next version should add these in order:

1. Manual QA for saved purchased numbers and lucky-store map
2. QR scan for lottery tickets after a real QR sample is available
3. Automatic winning-number updates via GitHub Actions
4. Automatic lucky-store data updates
5. App icon/store refresh follow-up as needed

The user explicitly asked to proceed in sequence without asking unnecessary questions.

## Repo / Environment

- Working repo: `/Users/straynurbs/dev/LottoAnalyzer-copy`
- Current branch: `continue-lotto-features`
- Shell: `zsh`
- Timezone: `Asia/Seoul`

## Existing App Structure

- Main tabs are in:
  - `/Users/straynurbs/dev/LottoAnalyzer-copy/app/(tabs)/index.tsx`
- Home recommendation UI:
  - `/Users/straynurbs/dev/LottoAnalyzer-copy/src/screens/HomeContent.tsx`
- Lotto draw data handling:
  - `/Users/straynurbs/dev/LottoAnalyzer-copy/src/data/lottoData.ts`
- Manual data fetch script:
  - `/Users/straynurbs/dev/LottoAnalyzer-copy/scripts/fetchLottoData.js`
- Saved purchased ticket model/storage:
  - `/Users/straynurbs/dev/LottoAnalyzer-copy/src/data/ticketStore.ts`
- Saved purchased ticket UI:
  - `/Users/straynurbs/dev/LottoAnalyzer-copy/src/screens/MyTicketsContent.tsx`
- Lucky-store map/list UI:
  - `/Users/straynurbs/dev/LottoAnalyzer-copy/src/screens/LuckyMapContent.native.tsx`
  - `/Users/straynurbs/dev/LottoAnalyzer-copy/src/screens/LuckyMapContent.tsx`
- Lucky-store data:
  - `/Users/straynurbs/dev/LottoAnalyzer-copy/data/lucky_stores.json`
  - `/Users/straynurbs/dev/LottoAnalyzer-copy/scripts/fetchLuckyStores.js`

## Remote Draw Data Strategy

The app should not require a full app update every draw.

Planned direction:

- GitHub Actions fetches latest winning numbers from Donghaeng Lottery
- Workflow updates a JSON file published through GitHub Pages
- App reads remote JSON at runtime
- Existing local bundled history remains as fallback

Likely target remote URL:

- `https://yoogeunhyuk.github.io/lotto-angle-app/lotto.json`

## Known Data Source

Donghaeng endpoint used in scripts:

- `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=...`

## QR / Purchase Ticket Goal

Wanted behavior:

- User can register purchased lotto lines before draw
- Registration should work via QR and manual entry
- Entries are stored locally
- After winning numbers are updated, saved entries automatically show result
- Matching numbers should be visually highlighted
- If not drawn yet, UI should show pending / pre-draw state

Current implementation:

- `내 번호` tab is wired into `app/(tabs)/index.tsx`.
- Manual A-E multi-game ticket registration is implemented.
- Saved tickets are stored in AsyncStorage.
- Result matching derives status from current draw history:
  - no draw result => `추첨전`
  - draw exists => rank/match result shown
- QR button now opens an Expo Camera QR scanner.
- Known Donghaeng `winQr` URL-style payloads are parsed into draw number and A-E games where possible.
- If parsing fails, the scanner displays the raw QR text so a real sample can be used to finalize the parser.
- A real Korean lotto QR URL/text sample is still needed for final parser verification.

## Lucky Store Map

Current implementation:

- `명당` tab is wired into `app/(tabs)/index.tsx` after `내 번호` and before `통계`.
- Native app uses `react-native-maps` and markers.
- Web preview uses a list fallback with external Naver Map links.
- The lucky-store screen has three top-level modes:
  - `판매점`: default mode; uses `expo-location` permission, infers the current administrative area, and fetches official nearby Lotto 6/45 retailers from `/prchsplcsrch/selectLtShp.do`.
  - `내 주변 명당`: nearby stores with bundled 1st/2nd-prize history.
  - `전국 명당`: list-only national ranking sorted by first-prize wins, with second-prize counts shown.
- If the official retailer endpoint is unavailable in native mode, `판매점` falls back to nearby winning-store data.
- Data comes from Donghaeng Lottery's winning-store API and is bundled in `data/lucky_stores.json`.
- Lucky-store data can be refreshed with `npm run update:lucky-stores`.
- `.github/workflows/update-lucky-stores.yml` runs after the weekly draw window and commits `data/lucky_stores.json` when a new latest round is available.
- Current bundled dataset:
  - Lotto 6/45
  - Offline stores only
  - Recent 260 rounds
  - 963~1222
  - 7,003 unique offline winning stores
  - 2,239 stores with first-prize history
  - 6,674 stores with second-prize history

Production note:

- Expo Go should work for map testing.
- Location permission copy is configured in `app.json`.
- Android standalone/production map builds may need Google Maps API key configuration before release.
- Native Naver/Kakao maps will require map platform keys plus an EAS development/production build; Expo Go cannot load those custom native SDK modules.

Reference screen idea from user:

- One section for the round result
- One list of purchased lines below
- Each line displays result like `1등`, `5등`, `낙첨`, or `추첨전`

## Suggested Local Storage Model

Use AsyncStorage with a purchase-ticket store, for example:

- `SavedTicket`
  - `id`
  - `drawNo`
  - `games`
  - `source` (`qr` or `manual`)
  - `rawText`
  - `createdAt`

Each game:

- six numbers
- optional metadata if needed later

## Matching Logic

Korean Lotto 6/45 result rules:

- `6 match` => `1등`
- `5 match + bonus` => `2등`
- `5 match` => `3등`
- `4 match` => `4등`
- `3 match` => `5등`
- otherwise `낙첨`
- before draw result exists => `추첨전`

## App Icon Direction

Current final user choice for the next icon work:

- Use the new more direct lottery-style icon
- User provided a file path:
  - `/Users/straynurbs/앱 개발/APP ICON.png`

If a fresh thread continues icon work, verify that this file still exists before generating all app icon variants.

## Deployment / Store Notes

### Google Play

- Google Play submission path was already set up previously.
- User found Google Play release flow more complex than expected.
- Do not spend time re-explaining the full console unless the user asks.

### App Store

- First iOS submission previously failed because Apple required the app age rating to mark gambling-related content appropriately.
- Apple specifically requested selecting `Yes` for gambling-related content in age rating metadata because the app includes prediction/info related to real-money gambling.
- If App Store submission work resumes, first check current status in App Store Connect instead of assuming failure or success.

## Commands / Build Notes

Useful commands:

- Install Expo dependency:
  - `npx expo install <package>`
- Android build:
  - `npx eas-cli@latest build --platform android --profile production`
- iOS build:
  - `npx eas-cli@latest build --platform ios --profile production`

Already-approved command prefixes in this workspace include `npx expo` and `npx eas`, so continuing build/setup work is easier.

## Context-Saving Workflow

When the thread gets long, do this instead of relying on conversation compression:

1. Update this file with only durable facts.
2. Update `/Users/straynurbs/dev/LottoAnalyzer-copy/WORKFLOW.md` when implementation details or release state change.
3. Keep temporary debugging details out unless they matter later.
4. Start a new thread with:
   - `Read /Users/straynurbs/dev/LottoAnalyzer-copy/docs/CODEX_HANDOFF.md and continue implementing the next version roadmap.`

## What Not To Lose

- User prefers momentum over repeated clarification.
- Make reasonable assumptions and keep going.
- For substantial changes, explain briefly what is being changed before editing.
- Use `apply_patch` for manual file edits.
- Do not revert unrelated user changes.
