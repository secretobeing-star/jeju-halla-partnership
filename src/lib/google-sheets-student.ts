import { google } from "googleapis";
import {
  DEFAULT_STUDENT_SHEETS_APPROVAL_TAB,
  DEFAULT_STUDENT_SHEETS_LOG_TAB,
  type StudentApprovalStatus,
  type StudentGraduationStatus,
} from "@/lib/site-student-auth-settings";

export type StudentApplicationPayload = {
  department: string;
  major: string;
  studentId: string;
  name: string;
  phone: string;
  graduationStatus: StudentGraduationStatus;
  notes: string;
  photoUrl: string | null;
  deviceKey: string;
  /** 시트 A:H 표준 필드용 (선택) */
  email?: string;
  statusType?: string;
  userId?: string;
  createdAt?: string;
};

export type StudentSheetsConfig = {
  spreadsheetId: string;
  logTab: string;
  approvalTab: string;
};

export type StudentStatusRecord = {
  approvalStatus: StudentApprovalStatus;
  studentId: string;
  name: string | null;
  photoUrl: string | null;
  department: string | null;
  major: string | null;
};

function getServiceAccountCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || "";
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() || "";
  if (!email || !privateKeyRaw) {
    return null;
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  return { email, privateKey };
}

export function resolveStudentSheetsConfig(partial?: {
  spreadsheetId?: string | null;
  logTab?: string | null;
  approvalTab?: string | null;
}): StudentSheetsConfig | null {
  const spreadsheetId =
    partial?.spreadsheetId?.trim() ||
    process.env.GOOGLE_SHEETS_STUDENT_SPREADSHEET_ID?.trim() ||
    "";
  if (!spreadsheetId) {
    return null;
  }

  return {
    spreadsheetId,
    logTab: partial?.logTab?.trim() || DEFAULT_STUDENT_SHEETS_LOG_TAB,
    approvalTab: partial?.approvalTab?.trim() || DEFAULT_STUDENT_SHEETS_APPROVAL_TAB,
  };
}

async function getSheetsClient() {
  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    throw new Error(
      "Google Sheets 서비스 계정이 설정되지 않았습니다. GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY를 확인하세요.",
    );
  }

  const auth = new google.auth.JWT({
    email: credentials.email,
    key: credentials.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function graduationLabel(status: StudentGraduationStatus) {
  return status === "graduated" ? "졸업" : "재학";
}

function normalizeApprovalStatus(raw: string | null | undefined): StudentApprovalStatus {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) {
    return "none";
  }
  if (
    value === "approved" ||
    value === "승인" ||
    value === "승인됨" ||
    value === "y" ||
    value === "yes" ||
    value === "true" ||
    value === "1"
  ) {
    return "approved";
  }
  if (
    value === "rejected" ||
    value === "거절" ||
    value === "반려" ||
    value === "n" ||
    value === "no" ||
    value === "false" ||
    value === "0"
  ) {
    return "rejected";
  }
  if (value === "pending" || value === "대기" || value === "승인대기" || value === "대기중") {
    return "approved";
  }
  return "approved";
}

export function getStudentSheetWebhookUrl() {
  // 서버 전용 env 우선 (클라이언트에 노출되지 않음)
  return (
    process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEBHOOK_URL?.trim() ||
    ""
  );
}

/** Apps Script 웹훅 표준 payload (승인/로그 공통) */
export type StudentSheetWebhookPayload = {
  sheetName: string;
  student_id: string;
  name: string;
  status: string;
  image_url: string;
  department: string;
  remarks: string;
  created_at: string;
};

export type SheetWebhookCorePayload = StudentSheetWebhookPayload;
export type StudentApplicationWebhookPayload = StudentSheetWebhookPayload;

export function buildStudentSheetWebhookPayload(input: {
  sheetName?: string;
  studentId: string;
  name: string;
  status?: string;
  imageUrl?: string | null;
  department?: string;
  remarks?: string | null;
  createdAt?: string;
}): StudentSheetWebhookPayload {
  const status = input.status?.trim() || "승인";
  return {
    sheetName: input.sheetName?.trim() || DEFAULT_STUDENT_SHEETS_APPROVAL_TAB,
    student_id: input.studentId.trim(),
    name: input.name.trim(),
    status,
    image_url: input.imageUrl?.trim() || "",
    department: input.department?.trim() || "",
    remarks: input.remarks?.trim() || "",
    created_at: input.createdAt?.trim() || new Date().toISOString(),
  };
}

/** @deprecated buildStudentSheetWebhookPayload 사용 */
export function buildSheetWebhookCorePayload(input: {
  department?: string;
  studentId: string;
  name: string;
  email?: string;
  statusType?: string;
  userId?: string;
  status?: string;
  createdAt?: string;
  sheetName?: string;
  imageUrl?: string | null;
  remarks?: string | null;
}): StudentSheetWebhookPayload {
  return buildStudentSheetWebhookPayload({
    sheetName: input.sheetName,
    studentId: input.studentId,
    name: input.name,
    status: input.status,
    imageUrl: input.imageUrl,
    department: input.department,
    remarks: input.remarks,
    createdAt: input.createdAt,
  });
}

/**
 * Google Apps Script 웹훅으로 학생증 승인/로그를 전송합니다.
 * Content-Type은 text/plain (Apps Script CORS 호환).
 */
export async function postStudentApplicationWebhook(
  payload: StudentSheetWebhookPayload,
): Promise<{ ok: true } | { ok: false; skipped: true } | { ok: false; error: string }> {
  const webhookUrl = getStudentSheetWebhookUrl();
  if (!webhookUrl) {
    return { ok: false, skipped: true };
  }

  const body: StudentSheetWebhookPayload = {
    sheetName: payload.sheetName?.trim() || DEFAULT_STUDENT_SHEETS_APPROVAL_TAB,
    student_id: payload.student_id.trim(),
    name: payload.name.trim(),
    status: payload.status?.trim() || "승인",
    image_url: payload.image_url?.trim() || "",
    department: payload.department?.trim() || "",
    remarks: payload.remarks?.trim() || "",
    created_at: payload.created_at?.trim() || new Date().toISOString(),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        ok: false,
        error: `웹훅 응답 ${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "웹훅 전송에 실패했습니다.",
    };
  }
}

export type EventLogWebhookPayload = {
  type: "event_log";
  event_title: string;
  department: string;
  student_id: string;
  name: string;
  place_name: string;
  stamp_index: number;
  is_won: boolean;
  reward_name: string;
};

export async function postPlainJsonWebhook(
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; skipped: true } | { ok: false; error: string }> {
  const webhookUrl = getStudentSheetWebhookUrl();
  if (!webhookUrl) {
    return { ok: false, skipped: true };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        ok: false,
        error: `웹훅 응답 ${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "웹훅 전송에 실패했습니다.",
    };
  }
}

/**
 * 사용자_로그 A:H 표준 행
 * A created_at | B department | C student_id | D name |
 * E email | F status_type | G user_id | H status
 */
export async function appendStudentApplication(
  config: StudentSheetsConfig,
  payload: StudentApplicationPayload,
) {
  const sheets = await getSheetsClient();
  const submittedAt = payload.createdAt?.trim() || new Date().toISOString();
  const statusType =
    payload.statusType?.trim() || graduationLabel(payload.graduationStatus);
  const userId = payload.userId?.trim() || payload.deviceKey;
  const range = `'${config.logTab}'!A:H`;

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          submittedAt,
          payload.department,
          payload.studentId,
          payload.name,
          payload.email?.trim() || "",
          statusType,
          userId,
          "대기",
        ],
      ],
    },
  });
}

export async function deleteStudentFromSheets(config: StudentSheetsConfig, studentId: string) {
  const sheets = await getSheetsClient();
  const range = `'${config.logTab}'!A:H`;

  // 해당 학생의 행 찾기
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range,
  });

  const values = response.data.values;
  if (!values || values.length === 0) {
    throw new Error("시트에 데이터가 없습니다.");
  }

  const hasHeader = looksLikeLogHeader((values[0] ?? []).map(String));
  const columns = resolveLogColumnIndexes(
    hasHeader ? (values[0] ?? []).map(String) : null,
  );

  // 헤더 행(1행)을 제외하고 학번으로 행 찾기
  let rowIndex = -1;
  for (let i = hasHeader ? 1 : 0; i < values.length; i++) {
    const row = values[i];
    if (String(row?.[columns.studentId] ?? "").trim() === studentId) {
      rowIndex = i + 1; // 1-based index
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error("해당 학생을 찾을 수 없습니다.");
  }

  // 해당 행 삭제
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: 0, // 첫 번째 시트
              dimension: "ROWS",
              startIndex: rowIndex - 1, // 0-based index
              endIndex: rowIndex, // endIndex는 제외되므로 rowIndex
            },
          },
        },
      ],
    },
  });
}

export type StudentApplicationLogRow = {
  rowNumber: number;
  submittedAt: string;
  department: string;
  major: string;
  studentId: string;
  name: string;
  phone: string;
  graduation: string;
  notes: string;
  photoUrl: string;
  deviceKey: string;
  status: string;
  statusNormalized: StudentApprovalStatus;
};

export type ListStudentApplicationLogsOptions = {
  query?: string;
  status?: "all" | StudentApprovalStatus;
  from?: string;
  to?: string;
  limit?: number;
};

function cell(row: string[], index: number) {
  if (index < 0) {
    return "";
  }
  return String(row[index] ?? "").trim();
}

/** 상태 열 문자 (A=0). 기본 A:H → H */
function statusColumnLetter(columnIndex: number) {
  const index = columnIndex >= 0 ? columnIndex : DEFAULT_LOG_COLUMN_INDEX.status;
  return String.fromCharCode(65 + Math.min(Math.max(index, 0), 25));
}

function looksLikeLogHeader(row: string[]) {
  const joined = row.map((value) => String(value ?? "").toLowerCase()).join(" ");
  return (
    joined.includes("학번") ||
    joined.includes("student") ||
    joined.includes("submitted") ||
    joined.includes("신청") ||
    joined.includes("시간") ||
    joined.includes("이름") ||
    joined.includes("상태")
  );
}

/**
 * 기본 열 순서(A:H):
 * created_at, department, student_id, name, email, status_type, user_id, status
 * (구 A:K 레이아웃은 헤더 별칭으로 자동 매핑)
 */
const DEFAULT_LOG_COLUMN_INDEX = {
  submittedAt: 0,
  department: 1,
  studentId: 2,
  name: 3,
  phone: 4, // email 열을 연락처 검색용으로도 사용
  graduation: 5, // status_type
  deviceKey: 6, // user_id
  status: 7,
  major: -1,
  notes: -1,
  photoUrl: -1,
} as const;

type LogColumnKey = keyof typeof DEFAULT_LOG_COLUMN_INDEX;

function resolveLogColumnIndexes(headerRow: string[] | null): Record<LogColumnKey, number> {
  const indexes: Record<LogColumnKey, number> = { ...DEFAULT_LOG_COLUMN_INDEX };
  if (!headerRow || headerRow.length === 0) {
    return indexes;
  }

  const normalized = headerRow.map((value) => String(value ?? "").trim().toLowerCase());
  const findIndex = (aliases: string[]) =>
    normalized.findIndex((cellValue) =>
      aliases.some((alias) => cellValue.includes(alias.toLowerCase())),
    );

  const mapping: Array<{ key: LogColumnKey; aliases: string[] }> = [
    {
      key: "submittedAt",
      aliases: [
        "제출",
        "신청시각",
        "신청시간",
        "일시",
        "시간",
        "created_at",
        "created",
        "submitted",
        "timestamp",
      ],
    },
    { key: "department", aliases: ["학과", "department"] },
    { key: "major", aliases: ["직속", "전공", "major"] },
    { key: "studentId", aliases: ["학번", "student id", "studentid", "student_id"] },
    { key: "name", aliases: ["이름", "성명", "name"] },
    {
      key: "phone",
      aliases: ["연락처", "전화", "휴대폰", "phone", "mobile", "email", "이메일", "메일"],
    },
    {
      key: "graduation",
      aliases: ["졸업", "재학", "graduation", "status_type", "재학구분", "구분"],
    },
    { key: "notes", aliases: ["비고", "메모", "notes", "기타"] },
    { key: "photoUrl", aliases: ["사진", "photo", "이미지"] },
    {
      key: "deviceKey",
      aliases: ["device", "기기", "device_key", "devicekey", "user_id", "userid", "uid"],
    },
    { key: "status", aliases: ["상태", "승인상태", "status"] },
  ];

  for (const entry of mapping) {
    const found = findIndex(entry.aliases);
    if (found >= 0) {
      indexes[entry.key] = found;
    }
  }

  return indexes;
}

function parseLogSubmittedAt(value: string): number | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const direct = Date.parse(trimmed);
  if (!Number.isNaN(direct)) {
    return direct;
  }

  const isoLike = Date.parse(trimmed.replace(" ", "T"));
  if (!Number.isNaN(isoLike)) {
    return isoLike;
  }

  // 구글 시트 한국어 로캘: 2026. 8. 17 오전 10:34:00 / 2026. 8. 17. 오후 3:05:01
  const korean = trimmed.match(
    /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\s*(오전|오후)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (korean) {
    const year = Number(korean[1]);
    const month = Number(korean[2]);
    const day = Number(korean[3]);
    let hour = Number(korean[5]);
    const minute = Number(korean[6]);
    const second = Number(korean[7] ?? "0");
    const meridiem = korean[4];
    if (meridiem === "오후" && hour < 12) hour += 12;
    if (meridiem === "오전" && hour === 12) hour = 0;
    const ms = new Date(year, month - 1, day, hour, minute, second).getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  // 2026/8/17 10:34 또는 8/17/2026 10:34:00
  const slash = trimmed.match(
    /^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (slash) {
    let year = Number(slash[1]);
    let month = Number(slash[2]);
    let day = Number(slash[3]);
    if (year < 1000 && day > 31) {
      // M/D/YYYY
      const tmp = year;
      year = day;
      day = month;
      month = tmp;
    } else if (String(slash[1]).length <= 2 && String(slash[3]).length === 4) {
      // M/D/YYYY
      const m = year;
      const d = month;
      year = day;
      month = m;
      day = d;
    }
    const hour = Number(slash[4] ?? "0");
    const minute = Number(slash[5] ?? "0");
    const second = Number(slash[6] ?? "0");
    const ms = new Date(year, month - 1, day, hour, minute, second).getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  return null;
}

export async function listStudentApplicationLogs(
  config: StudentSheetsConfig,
  options: ListStudentApplicationLogsOptions = {},
): Promise<StudentApplicationLogRow[]> {
  const sheets = await getSheetsClient();
  const range = `'${config.logTab}'!A:Z`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range,
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const rows = response.data.values ?? [];
  if (rows.length === 0) {
    return [];
  }

  const hasHeader = looksLikeLogHeader(rows[0] ?? []);
  const startIndex = hasHeader ? 1 : 0;
  const columns = resolveLogColumnIndexes(hasHeader ? (rows[0] ?? []).map(String) : null);
  const query = options.query?.trim().toLowerCase() ?? "";
  const statusFilter = options.status && options.status !== "all" ? options.status : null;
  const fromMs = options.from ? Date.parse(`${options.from}T00:00:00`) : NaN;
  const toMs = options.to ? Date.parse(`${options.to}T23:59:59.999`) : NaN;
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 1000);

  const parsed: StudentApplicationLogRow[] = [];
  for (let i = startIndex; i < rows.length; i += 1) {
    const row = (rows[i] ?? []).map((value) => String(value ?? ""));
    const studentId = cell(row, columns.studentId);
    const name = cell(row, columns.name);
    const submittedAt = cell(row, columns.submittedAt);
    if (!studentId && !name && !submittedAt) {
      continue;
    }

    const statusRaw = cell(row, columns.status) || "pending";
    const statusNormalized = normalizeApprovalStatus(statusRaw);
    const submittedMs = parseLogSubmittedAt(submittedAt);

    if (statusFilter && statusNormalized !== statusFilter) {
      continue;
    }

    if (Number.isFinite(fromMs) && submittedMs !== null && submittedMs < fromMs) {
      continue;
    }
    if (Number.isFinite(toMs) && submittedMs !== null && submittedMs > toMs) {
      continue;
    }

    if (query) {
      const haystack = [
        submittedAt,
        cell(row, columns.department),
        cell(row, columns.major),
        studentId,
        name,
        cell(row, columns.phone),
        cell(row, columns.graduation),
        cell(row, columns.notes),
        statusRaw,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) {
        continue;
      }
    }

    parsed.push({
      rowNumber: i + 1,
      submittedAt,
      department: cell(row, columns.department),
      major: cell(row, columns.major),
      studentId,
      name,
      phone: cell(row, columns.phone),
      graduation: cell(row, columns.graduation),
      notes: cell(row, columns.notes),
      photoUrl: cell(row, columns.photoUrl),
      deviceKey: cell(row, columns.deviceKey),
      status: statusRaw,
      statusNormalized,
    });
  }

  // 최신순: 날짜 우선, 파싱 실패·동일 시각이면 시트 행 번호(append된 새 행) 우선
  parsed.sort((a, b) => {
    const aMs = parseLogSubmittedAt(a.submittedAt);
    const bMs = parseLogSubmittedAt(b.submittedAt);
    if (aMs !== null && bMs !== null && aMs !== bMs) {
      return bMs - aMs;
    }
    if (aMs !== null && bMs === null) {
      return -1;
    }
    if (aMs === null && bMs !== null) {
      return 1;
    }
    return b.rowNumber - a.rowNumber;
  });

  return parsed.slice(0, limit);
}

export type StudentDuplicateCheckResult = {
  duplicate: boolean;
  reason: "log_pending" | "log_approved" | "approval_pending" | "approval_approved" | null;
};

export async function checkStudentApplicationDuplicate(
  config: StudentSheetsConfig,
  studentId: string,
): Promise<StudentDuplicateCheckResult> {
  const trimmedId = studentId.trim();
  if (!trimmedId) {
    return { duplicate: false, reason: null };
  }

  const approval = await lookupStudentApprovalStatus(config, trimmedId);
  if (approval.approvalStatus === "approved") {
    return { duplicate: true, reason: "approval_approved" };
  }
  if (approval.approvalStatus === "pending") {
    return { duplicate: true, reason: "approval_approved" };
  }

  const logs = await listStudentApplicationLogs(config, {
    query: trimmedId,
    limit: 500,
  });
  const exact = logs.filter((row) => row.studentId === trimmedId);
  if (exact.some((row) => row.statusNormalized === "approved")) {
    return { duplicate: true, reason: "log_approved" };
  }
  if (exact.some((row) => row.statusNormalized === "pending")) {
    return { duplicate: true, reason: "log_approved" };
  }

  return { duplicate: false, reason: null };
}

function statusSheetLabel(status: "approved" | "rejected" | "pending") {
  if (status === "approved") return "승인";
  if (status === "rejected") return "거절";
  return "대기";
}

export async function deleteStudentLogRow(
  config: StudentSheetsConfig,
  rowNumber: number,
) {
  if (!Number.isFinite(rowNumber) || rowNumber < 2) {
    throw new Error("삭제할 로그 행 번호가 올바르지 않습니다.");
  }

  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: config.spreadsheetId,
    fields: "sheets.properties(sheetId,title)",
  });
  const targetSheet = (meta.data.sheets ?? []).find(
    (sheet) => sheet.properties?.title === config.logTab,
  );
  const sheetId = targetSheet?.properties?.sheetId;
  if (typeof sheetId !== "number") {
    throw new Error(`로그 탭「${config.logTab}」을 찾을 수 없습니다.`);
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
}

export async function updateStudentLogStatus(
  config: StudentSheetsConfig,
  rowNumber: number,
  status: "approved" | "rejected" | "pending",
) {
  const sheets = await getSheetsClient();
  const headerRange = `'${config.logTab}'!A1:Z1`;
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: headerRange,
  });
  const headerRow = (headerRes.data.values?.[0] ?? []).map(String);
  const columns = resolveLogColumnIndexes(
    looksLikeLogHeader(headerRow) ? headerRow : null,
  );
  const colLetter = statusColumnLetter(columns.status);

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: `'${config.logTab}'!${colLetter}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[statusSheetLabel(status)]],
    },
  });
}

export async function upsertStudentApprovalRecord(
  config: StudentSheetsConfig,
  record: {
    studentId: string;
    name: string;
    status: "approved" | "rejected" | "pending";
    photoUrl?: string;
    department?: string;
    major?: string;
  },
) {
  const sheets = await getSheetsClient();
  const trimmedId = record.studentId.trim();
  const range = `'${config.approvalTab}'!A:G`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];
  const startIndex =
    typeof rows[0]?.[0] === "string" &&
    (rows[0][0].includes("학번") || rows[0][0].toLowerCase().includes("student"))
      ? 1
      : 0;

  let targetRowNumber: number | null = null;
  for (let i = startIndex; i < rows.length; i += 1) {
    const rowStudentId = String(rows[i]?.[0] ?? "").trim();
    if (rowStudentId && rowStudentId === trimmedId) {
      targetRowNumber = i + 1;
      break;
    }
  }

  const values = [
    trimmedId,
    record.name.trim(),
    statusSheetLabel(record.status),
    record.photoUrl?.trim() || "",
    record.department?.trim() || "",
    record.major?.trim() || "",
    new Date().toISOString(),
  ];

  if (targetRowNumber) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: `'${config.approvalTab}'!A${targetRowNumber}:G${targetRowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });
    return;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

export async function lookupStudentApprovalStatus(
  config: StudentSheetsConfig,
  studentId: string,
): Promise<StudentStatusRecord> {
  const sheets = await getSheetsClient();
  const trimmedId = studentId.trim();
  const range = `'${config.approvalTab}'!A:G`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];
  if (rows.length === 0) {
    return {
      approvalStatus: "none",
      studentId: trimmedId,
      name: null,
      photoUrl: null,
      department: null,
      major: null,
    };
  }

  // Skip header if first cell looks like a header
  const startIndex =
    typeof rows[0]?.[0] === "string" &&
    (rows[0][0].includes("학번") || rows[0][0].toLowerCase().includes("student"))
      ? 1
      : 0;

  for (let i = rows.length - 1; i >= startIndex; i -= 1) {
    const row = rows[i] ?? [];
    const rowStudentId = String(row[0] ?? "").trim();
    if (!rowStudentId || rowStudentId !== trimmedId) {
      continue;
    }

    return {
      approvalStatus: normalizeApprovalStatus(String(row[2] ?? "")),
      studentId: rowStudentId,
      name: String(row[1] ?? "").trim() || null,
      photoUrl: String(row[3] ?? "").trim() || null,
      department: String(row[4] ?? "").trim() || null,
      major: String(row[5] ?? "").trim() || null,
    };
  }

  return {
    approvalStatus: "none",
    studentId: trimmedId,
    name: null,
    photoUrl: null,
    department: null,
    major: null,
  };
}

export async function updateStudentApprovalPhoto(
  config: StudentSheetsConfig,
  studentId: string,
  photoUrl: string,
): Promise<boolean> {
  const sheets = await getSheetsClient();
  const trimmedId = studentId.trim();
  const nextPhoto = photoUrl.trim();
  if (!trimmedId || !nextPhoto) {
    return false;
  }

  const range = `'${config.approvalTab}'!A:G`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];
  if (rows.length === 0) {
    return false;
  }

  const startIndex =
    typeof rows[0]?.[0] === "string" &&
    (rows[0][0].includes("학번") || rows[0][0].toLowerCase().includes("student"))
      ? 1
      : 0;

  let targetRowNumber: number | null = null;
  for (let i = rows.length - 1; i >= startIndex; i -= 1) {
    const row = rows[i] ?? [];
    const rowStudentId = String(row[0] ?? "").trim();
    if (rowStudentId && rowStudentId === trimmedId) {
      // Sheets rows are 1-indexed
      targetRowNumber = i + 1;
      break;
    }
  }

  if (!targetRowNumber) {
    return false;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: `'${config.approvalTab}'!D${targetRowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[nextPhoto]],
    },
  });

  return true;
}

export async function loadStudentSheetsConfigFromDb(): Promise<StudentSheetsConfig | null> {
  const { createSupabaseServer } = await import("@/lib/supabase-server");
  const supabase = createSupabaseServer();
  if (!supabase) {
    return resolveStudentSheetsConfig();
  }

  const { data } = await supabase
    .from("site_settings")
    .select(
      "site_student_sheets_spreadsheet_id, site_student_sheets_log_tab, site_student_sheets_approval_tab",
    )
    .eq("id", 1)
    .maybeSingle();

  return resolveStudentSheetsConfig({
    spreadsheetId: data?.site_student_sheets_spreadsheet_id ?? null,
    logTab: data?.site_student_sheets_log_tab ?? null,
    approvalTab: data?.site_student_sheets_approval_tab ?? null,
  });
}
