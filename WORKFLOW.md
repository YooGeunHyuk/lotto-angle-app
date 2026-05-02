# LottoAnalyzer Workflow Notes

이 파일은 컨텍스트 압축 이후에도 바로 이어서 작업하기 위한 고정 메모입니다.

## How To Resume In A New Chat

새 채팅에서 이어서 작업할 때는 먼저 아래 순서로 확인한다.

1. `WORKFLOW.md`를 읽고 현재 목표와 미완료 항목을 파악한다.
2. `git status --short`로 로컬 변경사항을 확인한다.
3. `npm run lint`로 빠른 건강 상태를 확인한다.
4. 작업이 길어질 것 같으면 `WORKFLOW.md`의 "Current Working State"와 "Immediate Next Work"를 먼저 갱신한다.

Current branch for continued work: `continue-lotto-features`

## Project

- App name: 로또될각
- Workspace: `/Users/straynurbs/dev/LottoAnalyzer-copy`
- Framework: Expo React Native
- Android package: `com.meetyuuu.lottoanalyzer`
- iOS bundle ID: `com.meetyuuu.lottoanalyzer`
- App Store Connect app ID: `6764521345`
- Current icon source requested by user: `/Users/straynurbs/앱 개발/APP ICON.png`
- Repo icon target: `assets/images/icon.png`

## Current Store Status

### Apple App Store

- First iOS submission was rejected for Guideline 2.3.6 because Age Rating did not mark gambling.
- Required fix: App Store Connect > App Information > Age Rating > set Gambling to Yes.
- Korea/lottery metadata may require a higher age rating, likely 18+.
- Later App Store Connect showed `1.0 배포 준비됨`, which means approved and ready to release.
- After release, App Store search/listing can take several hours to appear.
- App icon changes require a new iOS build and resubmission.

### Google Play

- App package: `com.meetyuuu.lottoanalyzer`
- Closed/internal testing is configured.
- Keep the `Doply Test` closed test track as the main test track.
- Older `alpha` or internal test tracks can be paused; they do not necessarily need deletion.
- Production access generally requires 12+ testers and 14 days of closed testing.
- Ads are included, so Google Play's advertising ID / ads declaration must stay aligned with AdMob usage.
- Managed publishing may require manual publishing after review approval.

## Existing App Changes Already Made

- Main logo text changed from `LOTTO` to `로또될각`.
- Logo subtitle changed to `이번엔 진짜 로또될 각!`.
- Jua font is kept.
- Bottom tab `번호입력` was removed.
- Recommendation algorithm was diversified to avoid overly repeated numbers.
- Latest draw addition behavior was fixed so added draws are included in future analysis.
- AdMob banner area was hidden for screenshots, then re-enabled.
- Native AdMob banner lives in `src/components/AdBanner.native.tsx`; web fallback returns `null`.
- `expo-camera` dependency is installed for the upcoming QR scanner, but the QR scanner/parser is not finalized yet.

## Current Working State

- Local branch: `continue-lotto-features`
- Current focus: next-version ticket checking flow.
- Implemented first: `내 번호` tab, manual ticket registration for A-E games, ticket storage, pending/settled result matching.
- Ticket storage/model file: `src/data/ticketStore.ts`
- Ticket UI file: `src/screens/MyTicketsContent.tsx`
- Main tab wiring: `app/(tabs)/index.tsx`
- Do not finalize Korean lotto QR parser until the user provides at least one real lottery QR URL/text sample.
- Unrelated files to avoid mixing into lotto checkpoints unless explicitly requested: `docs/golf-demo.html` and `docs/assets/golf-*`.

## Lotto Data Architecture

- Remote draw data fetch is implemented in `src/data/lottoData.ts`.
- Current remote JSON URL:
  `https://gist.githubusercontent.com/YooGeunHyuk/c43d9902c513e986c4a9ee2bd78eee33/raw/lotto.json`
- Remote data is cached in AsyncStorage.
- Bundled fallback data: `data/lotto_history.json`
- Official Donghaeng fetch script: `scripts/fetchLottoData.js`
- Official endpoint used by the script:
  `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=...`
- `src/data/drawStore.ts` currently saves a single draw by `drwNo` under `user_draws`; this is not enough for purchased ticket history in the next version.

## Next Version Goals

1. Replace app icon with the more direct LOTTO-style icon.
2. Add QR lottery ticket scanner/checker.
3. Store purchased tickets by round.
4. Support both QR registration and manual registration.
5. Show tickets as pending before draw results are available.
6. After draw results are available, highlight matched numbers and show rank.
7. Automate winning-number updates so the user does not manually edit the Gist every week.

## QR Ticket Feature Plan

Add camera scanning with Expo camera/barcode scanning.

Required permission copy:

- iOS `NSCameraUsageDescription`: `로또 QR코드를 스캔해 구매 번호를 등록하기 위해 카메라를 사용합니다.`
- Android: camera permission through Expo config/plugin.

Need from user:

- At least one real lottery QR URL/text sample.
- Korean lotto QR usually encodes a Donghaeng Lottery URL and purchase data, often with a `v=` parameter. Do not finalize parser logic without a real sample.

Suggested ticket model:

```ts
type SavedTicket = {
  id: string;
  drawNo: number;
  source: 'qr' | 'manual';
  createdAt: string;
  status: 'pending' | 'settled';
  games: TicketGame[];
};

type TicketGame = {
  id: string;
  numbers: number[];
  matchedNumbers?: number[];
  bonusMatched?: boolean;
  rank?: '1등' | '2등' | '3등' | '4등' | '5등' | '낙첨' | '추첨전';
};
```

Ranking:

- 6 matches: 1등
- 5 matches + bonus: 2등
- 5 matches: 3등
- 4 matches: 4등
- 3 matches: 5등
- otherwise: 낙첨

Likely UI:

- Add a tab or screen named `내 번호` or `확인`.
- Actions: QR scan, manual entry, ticket list grouped by draw.
- Draw card states: 추첨전, 결과 확인 완료, 당첨/낙첨.

## Automatic Draw Update Plan

Preferred option:

- Move draw JSON hosting from Gist to the repo/GitHub Pages.
- Add GitHub Actions scheduled after Saturday draw, for example Saturday 21:30 KST, plus manual dispatch.
- The action runs `node scripts/fetchLottoData.js`, commits updated JSON, and publishes it.
- App fetches the repo-hosted JSON URL.

Alternative:

- Keep Gist URL.
- GitHub Actions updates Gist through the Gist API.
- Requires a GitHub token/PAT with `gist` scope stored as a repository secret.

Serverless option:

- Use Vercel or Cloudflare Worker as a small API.
- API fetches official Donghaeng endpoint and returns normalized JSON.
- More robust than manual Gist edits, but adds hosting/admin overhead.

## Build And Release Notes

### Android

- Each uploaded `.aab` must have a new `versionCode`.
- Build command:
  `npx eas-cli@latest build --platform android --profile production`
- If Google Play says `version code already used`, increase versionCode or let EAS remote auto-increment create a new one.
- Upload the `.aab` to the correct Play Console track.

### iOS

- Each uploaded iOS build must have a new `buildNumber`.
- Build command:
  `npx eas-cli@latest build --platform ios --profile production`
- Submit command:
  `npx eas-cli@latest submit --platform ios`
- App metadata-only fixes do not always require a new build.
- App icon or binary changes require a new build.

## Common Commands

```sh
npm start
npm run ios
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios
node scripts/fetchLottoData.js
```

## Immediate Next Work

For the next coding session:

1. Manually run the app and inspect `내 번호` on a device/simulator for layout and storage behavior.
2. Add ticket edit support if needed after manual QA.
3. Add QR scan screen after confirming real QR payload format.
4. Add camera permission copy to `app.json` before shipping QR scanner:
   - iOS `NSCameraUsageDescription`: `로또 QR코드를 스캔해 구매 번호를 등록하기 위해 카메라를 사용합니다.`
5. Add an automatic draw update workflow.
6. Keep `WORKFLOW.md` updated before creating commits or starting a new chat.
