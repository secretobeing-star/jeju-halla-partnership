# 구글 시트(Apps Script) 웹훅 — 로컬/배포 가이드

## 로컬 (`.env.local`)

프로젝트 루트에 `.env.local`을 만들고 아래를 넣습니다.

```env
GOOGLE_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/배포ID/exec
```

- `NEXT_PUBLIC_` 접두사를 **쓰지 마세요.** 웹훅 URL이 브라우저에 노출됩니다.
- 저장 후 `npm run dev`를 **재시작**해야 env가 반영됩니다.

## Vercel 배포

1. Vercel 프로젝트 → **Settings → Environment Variables**
2. Name: `GOOGLE_SHEET_WEBHOOK_URL`
3. Value: Apps Script 웹앱 URL (`.../exec`)
4. Environment: Production (필요 시 Preview도)
5. **Redeploy** (env만 바꾸면 기존 배포에는 안 붙습니다)

## API

| 경로 | 역할 |
|------|------|
| `POST /api/submit` | 웹훅만 중계 |
| `POST /api/student/apply` | 신청 + 웹훅 (`sheetName: 사용자_로그`, `status: 대기`) |
| `POST /api/admin/student-logs/review` | 승인 시 웹훅 (`sheetName: 승인`, `status: 승인`) |

서버는 Apps Script로 `Content-Type: text/plain` + `JSON.stringify(payload)` POST합니다.

## 통일 payload

```json
{
  "sheetName": "승인",
  "student_id": "20241234",
  "name": "홍길동",
  "status": "승인",
  "image_url": "https://...",
  "department": "컴퓨터정보과",
  "remarks": "",
  "created_at": "2026-08-17T11:00:00.000Z"
}
```

| 필드 | 승인 | 신청 로그 |
|------|------|-----------|
| sheetName | `승인` | `사용자_로그` |
| status | `승인` | `대기` |
| image_url | 학생증 이미지 URL | 신청 사진 URL (없으면 `""`) |
| remarks | 비고 (없으면 `""`) | 비고/커스텀필드 (없으면 `""`) |
