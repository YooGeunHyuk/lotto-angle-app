# App Store 1.1.0 제출용 메타데이터

업로드 후 App Store Connect → 로또될각 → 1.1.0 버전 페이지에서 아래 내용 복붙.

---

## 🆕 이 버전의 새로운 기능 (What's New)
**필수. 최대 4000자. 복붙용:**

```
이번 버전은 추천 알고리즘을 대폭 개선했습니다.

🎯 새로운 앙상블 추천 모드 (기본 모드)
5개 세트가 서로 다른 전략으로 추천되어 더 다양한 번호 조합을 받을 수 있습니다.
- 페어 친화 × 3세트: 역대 함께 자주 등장한 번호 조합 우선
- 콜드 회귀 × 1세트: 오래 안 나온 번호 강조
- 균형 분포 × 1세트: 홀짝 3:3 + 5구간 균등 강제

📌 각 추천 세트에 전략 라벨 표시
어떤 기준으로 추천된 번호인지 한눈에 확인 가능.

📐 하단 탭 레이아웃 최적화
화면 활용도를 높여 콘텐츠 영역 확대.

⚙️ 추천 알고리즘 통계적 정확도 개선
완전 무작위 셔플(Fisher-Yates)로 샘플링 편향 제거.

🎲 기존 모드(안정·공격·실험)도 그대로 사용 가능
모드 선택에서 원하는 스타일로 전환할 수 있습니다.
```

---

## 📝 프로모션 텍스트 (Promotional Text)
**선택. 최대 170자. 1.0.8 그대로 또는 아래로 갱신:**

```
앙상블 추천 모드 신규! 페어 친화·콜드 회귀·균형 분포 5종 전략이 한 번에. 명당 지도, 통계 분석, QR 스캔까지 통계 기반 로또 분석 앱.
```

---

## 📄 앱 설명 (Description)
**필수. 1.0.8 그대로 유지. 변경 안 함.**

(기존 설명 그대로 두면 됨)

---

## 🔍 키워드 (Keywords)
**100자 이내, 쉼표로 구분. 1.0.8과 동일:**

```
로또,당첨번호,로또번호생성,번호추천,통계,명당,복권,당첨,분석,로또분석,QR스캔,동행복권
```

---

## 📸 스크린샷
**1.0.8 것 그대로 재사용 가능.** 신기능 강조하고 싶으면 추가 1~2장 권장:
- 앙상블 모드 화면 (5세트가 각각 다른 전략 라벨 보이는 화면)
- 전략 라벨 배지 클로즈업

---

## ⚙️ 빌드 정보
- **버전**: 1.1.0
- **빌드 번호**: 42
- **번들 ID**: com.meetyuuu.lottoanalyzer
- **앱 ID**: 6764521345

---

## ✅ 변경사항 코드 레퍼런스 (참고용)

### 새 파일/변경
- `src/engine/predictor.ts` — ensemble 모드, PAIR 풀, BALANCE-strict, Fisher-Yates, 전략 라벨
- `src/screens/HomeContent.tsx` — 기본 모드 ensemble, 4개 모드 UI, 전략 배지
- `app/(tabs)/index.tsx` — 하단 탭 패딩 ~60% 축소
- `app.json` — 1.1.0, buildNumber 42, versionCode 15
- `ios/app/Info.plist` — 1.1.0, build 42
- `android/app/build.gradle` — versionCode 15, versionName "1.1.0"

### 8인 수학자 분석 (참고)
- `analysis/MATHEMATICAL_FINAL_VERDICT.md` — 8명 PhD 만장일치 결론

---

## 🛡️ 광고 / 데이터 수집 / 연령 등급
**1.0.8과 동일. 변경 없음.**
- AdMob 광고 사용
- IDFA: 사용 (광고 추적)
- 데이터 수집: 기기 ID + 광고 데이터 (타사 광고 목적, 추적 예)
- 개인정보 처리방침: https://yoogeunhyuk.github.io/lotto/privacy.html
- 지원 URL: https://yoogeunhyuk.github.io/lotto/

---

## 📋 제출 순서 (체크리스트)

```
[ ] 1. Xcode → Clean Build Folder
[ ] 2. Xcode 좌측 app → General → Version 1.1.0 / Build 42 확인
[ ] 3. 디바이스 셀렉터 → "Any iOS Device (arm64)"
[ ] 4. Product → Archive (5~10분)
[ ] 5. Organizer → Distribute App → App Store Connect → Upload
[ ] 6. 처리 대기 15~30분 (Apple 메일 옴)
[ ] 7. TestFlight 앱에서 1.1.0 (42) 설치 → 앙상블 모드 동작 확인
[ ] 8. App Store Connect → 1.1.0 버전 페이지 → 빌드 42 선택
[ ] 9. "이 버전의 새로운 기능" 입력 (위 텍스트 복붙)
[ ] 10. 프로모션 텍스트 갱신 (선택)
[ ] 11. 스크린샷 그대로 두거나 앙상블 화면 추가
[ ] 12. 제출 (Submit for Review)
[ ] 13. 심사 통과 대기 (24~48h)
```

---

## 📦 안드로이드 1.1.0 (별도 작업)
Android는 별도 빌드 필요:
```bash
cd /Users/straynurbs/dev/LottoAnalyzer/android
./gradlew --stop  # daemon 클리어
```
그 후 Android Studio → Build → Generate Signed App Bundle → app-release.aab → Play Console 업로드 → 새 버전 1.1.0 (15) → 출시 노트 (위 텍스트 그대로) → 심사 제출
