import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { google } from 'googleapis';

export async function POST(req: NextRequest) {
  try {
    // 1. 요청 바디에서 사용자 식별 정보 받기
    let userEmail: string | undefined;
    let providerToken: string | undefined;

    try {
      const body = await req.json();
      userEmail = body.email;
      providerToken = body.providerToken;
    } catch {
      // JSON body가 없을 경우 무시
    }

    // 세션 쿠키 등에서 백업으로 이메일 조회 (필요 시)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session_user')?.value;
    if (!userEmail && sessionCookie) {
      try {
        const parsed = JSON.parse(sessionCookie);
        userEmail = parsed.email;
      } catch {
        userEmail = sessionCookie;
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: '탈퇴할 사용자의 식별 정보(이메일)를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    // 2. 환경변수 확인 (지정한 키 명칭 적용)
    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!serviceEmail || !privateKey || !spreadsheetId) {
      return NextResponse.json(
        { error: 'Google Sheets 환경변수 설정이 누락되었습니다.' },
        { status: 500 }
      );
    }

    // 3. Google Sheets API 연동 및 유저 행 삭제
    const auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 스프레드시트의 첫 번째 시트(탭) 메타데이터 가져오기
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const firstSheet = sheetMeta.data.sheets?.[0];
    const sheetName = firstSheet?.properties?.title || 'Sheet1';
    const sheetGid = firstSheet?.properties?.sheetId || 0;

    // 시트 전체 데이터 조회
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = getRes.data.values || [];
    // 이메일이 포함된 행(Row) 인덱스 찾기
    const rowIndexToDelete = rows.findIndex((row) =>
      row.some((cell) => cell?.toString().trim() === userEmail?.trim())
    );

    if (rowIndexToDelete === -1) {
      return NextResponse.json(
        { error: '시트에서 등록된 사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 해당 행(Row) 영구 삭제
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetGid,
                dimension: 'ROWS',
                startIndex: rowIndexToDelete,
                endIndex: rowIndexToDelete + 1,
              },
            },
          },
        ],
      },
    });

    // 4. 구글 OAuth 권한 철회 (Google Account 연동 해제)
    if (providerToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${providerToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      } catch (tokenErr) {
        console.warn('Google 토큰 철회 경고:', tokenErr);
      }
    }

    // 5. 세션 쿠키 정리
    cookieStore.delete('session_user');
    cookieStore.delete('next-auth.session-token');
    cookieStore.delete('__Secure-next-auth.session-token');

    return NextResponse.json({
      success: true,
      message: '회원 탈퇴 및 시트 데이터 삭제가 완료되었습니다.',
    });
  } catch (err: any) {
    console.error('탈퇴 처리 서버 에러:', err);
    return NextResponse.json(
      { error: err.message || '탈퇴 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}