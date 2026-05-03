# 로또될각 개발 진행 현황

최종 업데이트: 2026-05-03  
작업 브랜치: `continue-lotto-features`  
프로젝트 경로: `/Users/straynurbs/dev/LottoAnalyzer-copy`

## 한 줄 요약

`로또될각`은 Expo + React Native 기반 로또 번호 추천 앱이며, 현재 번호 추천, 고정 추천, 합계 기반 추천, 내 번호 저장, 명당 지도, 통계, 최신 당첨번호 자동 반영 구조까지 개발되어 있다.

## 현재 탭 구성

하단 탭 순서:

1. `번호추천`
2. `고정추천`
3. `합계생성`
4. `내 번호`
5. `명당`
6. `통계`

최근 하단 탭 수정:

- 기능이 많아지면서 탭 간격을 조정했다.
- 첫 번째/마지막 탭이 너무 끝에 붙어 보이지 않도록 여백을 추가했다.
- 탭 아이콘 크기를 `22`에서 `19`로 줄였다.

## 오늘까지 구현된 주요 기능

### 번호추천

- 최신 당첨번호 표시
- 분석 기준 펼침/접힘 UI
- 번호 추천 버튼 제공
- 첫 화면의 `i` 안내 버튼 위치를 상단 기준 약 `65px`로 조정
- 첫 화면 안내 버튼은 `!`가 아니라 `i`로 통일

### 고정추천

- 사용자가 원하는 번호를 고정하고 나머지 번호를 자동 추천
- 추천 결과를 로또 공 색상으로 표시

### 합계생성

- 원하는 합계 범위 기반 번호 추천
- 저장/초기화/번호 추천 버튼을 둥근 버튼 스타일로 정리

### 내 번호

- 구매한 로또 번호를 직접 등록할 수 있는 탭 추가
- A~E 여러 게임 입력 가능
- 등록된 번호는 로컬 저장소에 저장
- 최신 당첨번호가 있으면 자동으로 등수 계산
- 추첨 전 회차는 `추첨전` 상태로 표시
- QR 기능은 아직 placeholder 상태
- QR은 실제 한국 로또 QR 샘플을 받은 뒤 구현 예정

### 통계

- 현재 로또 이력 데이터를 기준으로 번호 빈도, 미출현, 합계, 홀짝 등 통계 계산
- 최신 당첨번호가 추가되면 같은 `draws` 데이터를 통해 통계도 최신 기준으로 변경

## 명당 지도 진행 현황

명당 탭은 현재 `판매점`, `내 주변 명당`, `전국 명당` 세 개의 상위 모드로 구성되어 있다.

### 상위 모드

- `판매점`
- `내 주변 명당`
- `전국 명당`

### 하위 모드

`판매점` / `내 주변 명당` 선택 시:

- `내 주변 판매점`
- `내 주변 명당`
- `지도`

`전국 명당` 선택 시:

- `전국 순위`
- `지역별 명당`
- `최근 회차 판매점`
- `지도`

### 위치 기능

- 명당 탭에 진입하면 위치 권한 팝업이 자동으로 뜬다.
- 위치 권한을 허용하면 현재 위치 주변 기준으로 목록을 표시한다.
- 위치 권한을 거절해도 지도 안의 내 위치 아이콘을 누르면 다시 위치 요청을 시도한다.
- 이전에 있던 `내 위치 기준` 카드는 제거했다.
- 지도 안에 일반 지도 앱처럼 내 위치 찾기 아이콘을 추가했다.

### 지도/리스트 표시 방식

- 기본은 리스트 중심이다.
- `지도` 버튼을 누르면 현재 리스트에 있는 판매점을 지도 마커로 표시한다.
- 선택한 판매점 카드와 검색 결과 리스트의 가로폭을 맞췄다.
- `지도 표시` 문구는 `지도`로 줄이고 지도 아이콘은 유지했다.

### 데이터

명당 데이터는 동행복권 당첨 판매점 데이터를 바탕으로 한다.

현재 포함된 명당 데이터:

- 로또 6/45 기준
- 최근 260회
- 963~1222회
- 오프라인 당첨 판매점 약 7,003곳
- 1등 배출 이력 판매점 약 2,239곳
- 2등 배출 이력 판매점 약 6,674곳

판매점 모드는 현재 위치의 행정구역을 추정한 뒤 동행복권 판매점 API에서 주변 판매점을 조회한다. 조회가 불안정할 경우 가까운 당첨 이력 판매점으로 fallback한다.

### 지도 SDK 메모

- 현재는 `react-native-maps` 사용
- iOS에서는 Apple Maps 기반
- Android에서는 Google Maps 기반
- 카카오/네이버 지도는 Expo Go에서 바로 불가능
- 카카오/네이버 지도 적용 시 API 키와 EAS dev/prod build가 필요

## 최신 당첨번호 / DB 자동화

### 현재 최신 반영 상태

1222회 당첨번호가 기본 DB에 반영되어 있다.

- 회차: `1222`
- 추첨일: `2026.05.02`
- 당첨번호: `4, 11, 17, 22, 32, 41`
- 보너스: `34`

### 왜 자동화가 필요했는지

추천 로직과 통계는 기존 당첨번호 데이터 전체를 기반으로 한다. 따라서 최신 회차가 계속 누적되어야 추천과 통계가 신뢰도 있게 유지된다.

기존 문제:

- 앱 내장 DB는 1221회까지였다.
- 원격 gist 데이터도 1221회에서 멈춰 있었다.
- 그래서 1222회가 발표되어도 앱이 최신 번호를 알 수 없었다.

### 현재 자동화 구조

이제 세 단계로 최신 데이터를 반영한다.

1. 앱 기본 DB  
   `data/lotto_history.json`에 전체 회차 데이터가 들어 있다.

2. GitHub Actions 자동 갱신  
   `.github/workflows/update-lotto-data.yml`이 매주 토요일 밤 실행된다.  
   새 회차가 있으면 `data/lotto_history.json`을 업데이트하고 자동 커밋한다.

3. 앱 실행 시 원격 DB 확인  
   앱은 GitHub의 최신 `data/lotto_history.json`을 먼저 받아온다.  
   그 다음 동행복권 공식 API도 확인해서 새 회차가 있으면 앱 상태에 합친다.

### 관련 파일

- DB 파일: `data/lotto_history.json`
- 앱 데이터 로직: `src/data/lottoData.ts`
- 수집 스크립트: `scripts/fetchLottoData.js`
- 자동화 워크플로: `.github/workflows/update-lotto-data.yml`
- 실행 명령: `npm run update:lotto`

### 주의할 점

GitHub Actions 자동 실행은 이 브랜치가 `main`에 병합된 뒤부터 가장 자연스럽게 동작한다. 현재 브랜치에는 자동화 설정이 올라가 있으므로, `main`에 병합하면 매주 DB가 계속 누적되는 구조가 된다.

## 앱 아이콘 / 스토어 관련

- 앱 아이콘은 새 로또 기계 스타일 이미지로 변경 작업을 진행했다.
- Expo Go splash에서는 새 이미지가 보일 수 있지만, 홈 화면 아이콘은 빌드/설치 방식에 따라 캐시나 번들 상태 영향을 받을 수 있다.
- 스토어 제출 전에는 아이콘, splash, adaptive icon을 실제 빌드에서 다시 확인해야 한다.

## 현재 검증 상태

최근 주요 변경 후 아래 검증을 통과했다.

- `npm run lint`
- `npx tsc --noEmit`
- `npm run update:lotto`

Expo reload는 여러 번 시도했지만, 연결된 폰/시뮬레이터가 없을 때는 아래 메시지가 나온다.

```text
No apps connected. Sending "reload" to all React Native apps failed.
```

이 경우 폰에서 Expo Go로 다시 접속하면 최신 번들을 받을 수 있다.

## Expo Go 실행 명령

프로젝트 루트에서 실행:

```bash
npx expo start --port 8081
```

폰에서 Expo Go로 볼 때:

- 같은 Wi-Fi에 연결
- 터미널에 뜨는 QR을 Expo Go로 스캔
- 네트워크가 불안정하면 `--tunnel` 옵션 사용 가능

```bash
npx expo start --port 8081 --tunnel
```

## 최근 커밋 흐름

- `f96d2e4` Automate lotto draw database updates
- `87b5c32` Update latest draw and fetch official lotto updates
- `9cac25f` Adjust header info button position
- `c1abf13` Refine lucky map location controls
- `32bba7d` Restructure lucky map views
- `241cfdc` Add breathing room to bottom tabs
- `92f0c34` Round primary action buttons
- `f31a585` Polish lucky map selection layout
- `642f875` Rework lucky map around current location
- `6050d0b` Refine lucky store map modes
- `a79049c` Add nearby lucky store mode
- `0719e1b` Add lucky store map

## 앞으로 할 일

### 우선순위 높음

1. 명당 지도 실기기 QA
2. 위치 권한 허용/거절/재요청 흐름 확인
3. GitHub Actions가 `main`에서 정상 실행되는지 확인
4. 최신 DB가 앱에서 실제로 반영되는지 1223회 이후 확인
5. 내 번호 탭의 수동 등록과 당첨 결과 표시 QA

### 다음 개발 후보

1. QR 스캔 기능 구현
2. 실제 로또 QR 샘플 기반 파서 추가
3. 명당 데이터도 GitHub Actions로 자동 갱신
4. 명당 지도에서 지역별 필터 고도화
5. 전국 명당 리스트 정렬/검색 기능 추가
6. 앱 아이콘/스플래시 실제 빌드 검증
7. App Store / Google Play 제출용 메타데이터 정리

### 릴리즈 전 체크

- iOS 실기기 위치 권한 문구 확인
- Android 지도 API 키 필요 여부 확인
- 광고 모듈은 Expo Go에서 동작하지 않으므로 dev/prod build에서 확인
- 앱스토어 연령 등급에서 도박 관련 항목을 적절히 설정
- 번호 추천은 당첨 보장이 아니라 통계 기반 참고용이라는 안내 유지

## 새 채팅에서 이어서 작업할 때

새 채팅을 시작하면 아래처럼 요청하면 된다.

```text
/Users/straynurbs/dev/LottoAnalyzer-copy/docs/PROJECT_STATUS.md 파일을 먼저 읽고,
로또될각 앱 개발을 이어서 진행해줘.
```

같이 읽으면 좋은 파일:

- `docs/CODEX_HANDOFF.md`
- `WORKFLOW.md`

