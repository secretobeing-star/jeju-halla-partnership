# TWA (Trusted Web Activity) — Play Store 배포

PWA를 Android 앱(AAB)으로 감싸 Play Store에 올리면 Play Protect 경고 없이 설치할 수 있습니다.

## 사전 준비

1. [Google Play Console](https://play.google.com/console) 개발자 계정 ($25, 1회)
2. 앱 **패키지 이름** 결정 (예: `kr.chu.hallapass`) — 한 번 등록하면 변경 불가
3. 사이트 **PWA 켜기** + **메인 도메인** `https://chu-p.kro.kr` 설정
4. JDK 17+ 설치

## 1. Bubblewrap CLI

```powershell
npm install -g @bubblewrap/cli
```

## 2. TWA 프로젝트 초기화

저장소 **루트**에서:

```powershell
npm run twa:init
```

또는 직접:

```powershell
bubblewrap init --manifest=https://chu-p.kro.kr/manifest.json --directory=twa
```

질문에 답할 때:

- **Package name**: Play Console에 쓸 ID (예: `kr.chu.hallapass`)
- **App name**: Halla Pass
- **Signing key**: 새 키 생성 또는 기존 keystore 경로

생성 후 `twa/android/app/build.gradle` 에서 확인:

```gradle
compileSdkVersion 34
targetSdkVersion 34
```

Bubblewrap 최신 버전은 보통 34입니다. 34 미만이면 수동으로 올린 뒤 `versionCode` / `versionName` 을 Play 업로드마다 증가시키세요.

## 3. Digital Asset Links (assetlinks.json)

Play Console → **앱 서명** → **앱 서명 키 인증서** → **SHA-256** 복사

Vercel(또는 서버) 환경 변수:

```env
TWA_ANDROID_PACKAGE_NAME=kr.chu.hallapass
TWA_SHA256_FINGERPRINTS=AA:BB:CC:...:FF
```

여러 지문(업로드 키 + Play 앱 서명 키)은 쉼표로 구분합니다.

배포 후 확인:

```text
https://chu-p.kro.kr/.well-known/assetlinks.json
```

Google 검증 도구: https://developers.google.com/digital-asset-links/tools/generator

## 4. AAB 빌드

```powershell
npm run twa:build
```

산출물: `twa/app-release-signed.aab` (또는 `twa/app/build/outputs/bundle/release/`)

## 5. Play Console 업로드

1. Play Console → **테스트** → **내부 테스트**
2. **새 버전 만들기** → `app-release-signed.aab` 업로드
3. 스토어 등록정보(아이콘, 스크린샷, 설명) 작성
4. 검토 후 게시

## 6. 버전 관리

| 필드 | 위치 | 규칙 |
|------|------|------|
| `versionCode` | `twa/android/app/build.gradle` | 정수, 업로드마다 **반드시 증가** |
| `versionName` | 동일 | 사용자에게 보이는 버전 (예: `1.0.1`) |

## 주의

- `twa/*.keystore`, `*.aab` 는 git에 올리지 마세요 (`.gitignore` 처리됨)
- `assetlinks.json` 의 SHA-256은 **Play Console 앱 서명** 지문과 일치해야 합니다
- Samsung Internet PWA 직접 설치 이슈는 Play Store TWA로 우회하는 것이 가장 확실합니다

## 7. PWA 권한 ↔ Android 설정 연동 (웹 + TWA)

웹 PWA와 TWA는 **같은 URL**을 사용합니다. TWA는 Android Chrome 전체화면 래퍼일 뿐입니다.

### Vercel 환경 변수

```env
TWA_ANDROID_PACKAGE_NAME=kr.chu.hallapass
TWA_SHA256_FINGERPRINTS=AA:BB:...
# (선택) 클라이언트 fallback — 보통 TWA_ANDROID_PACKAGE_NAME만으로 충분
NEXT_PUBLIC_TWA_ANDROID_PACKAGE_NAME=kr.chu.hallapass
```

배포 후 `/api/twa-config` 에서 패키지명이 내려오면, Android **standalone PWA/TWA**에서:

- 앱 설정(톱니) → 알림/위치가 **거부됨**일 때 토글 → **Android 설정 앱**으로 이동
- 최초 권한 안내(거부 상태) → **「설정 열기」** 버튼

iOS PWA는 OS 제한으로 **설정 앱 바로 열기 불가** → 안내 문구만 표시됩니다.

### 동작 확인

1. Play Store TWA 또는 Android 홈 화면 PWA(standalone)로 실행
2. 알림/위치 **거부**
3. 앱 설정(톱니) → 해당 토글 ON → Android **알림 설정** 또는 **앱 정보** 화면 이동
4. 허용 후 앱으로 돌아오면 자동 연결(기존 focus/visibility sync)

Intent 이동은 Android/TWA에서 동작하며, 일부 기기·브라우저 PWA에서는 안 될 수 있습니다.
그 경우 `twa/custom/README.md` 의 네이티브 보강을 참고하세요.
