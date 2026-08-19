import type { SiteSettings } from "@/lib/supabase";

export const DEFAULT_STUDENT_AUTH_BUTTON_LABEL = "제주한라대 인증하기";
export const DEFAULT_STUDENT_CARD_TITLE = "학생증";
export const DEFAULT_STUDENT_AUTH_GUIDE_TITLE = "제주한라대 학생 인증";
export const DEFAULT_STUDENT_AUTH_GUIDE_BODY =
  "학생 인증을 진행하면 모바일 학생증을 사용할 수 있습니다. 안내에 따라 정보를 입력해 주세요.";
export const DEFAULT_STUDENT_PENDING_MESSAGE =
  "신청이 접수되었습니다. 관리자 승인 후 학생증을 이용할 수 있습니다.";
export const DEFAULT_STUDENT_SHEETS_LOG_TAB = "사용자_로그";
export const DEFAULT_STUDENT_SHEETS_APPROVAL_TAB = "승인";

export const SITE_STUDENT_NEED_LOGIN_EVENT = "site-student-need-login";
export const SITE_STUDENT_AUTH_INTENT_KEY = "site-student-auth-intent";

export type StudentApprovalStatus = "none" | "pending" | "approved" | "rejected";

export type StudentGraduationStatus = "enrolled" | "graduated";

export type SiteStudentUiLabels = {
  formTitle: string;
  department: string;
  major: string;
  studentId: string;
  name: string;
  phone: string;
  graduation: string;
  enrolled: string;
  graduated: string;
  notes: string;
  photo: string;
  cancel: string;
  submit: string;
  submitting: string;
  uploading: string;
  pendingTitle: string;
  cardSchool: string;
  cardDepartment: string;
  cardMajor: string;
  cardStudentId: string;
  cardStatus: string;
  cardPhotoEmpty: string;
  opacityLabel: string;
};

export type SiteStudentFormFieldKey =
  | "department"
  | "major"
  | "studentId"
  | "name"
  | "phone"
  | "graduation"
  | "notes"
  | "photo";

export type SiteStudentCustomField = {
  id: string;
  label: string;
};

export type SiteStudentUiLabelsStored = Record<string, unknown>;

export const DEFAULT_STUDENT_UI_LABELS: SiteStudentUiLabels = {
  formTitle: "정보 기입",
  department: "학과",
  major: "직속(전공)",
  studentId: "학번",
  name: "이름",
  phone: "연락처",
  graduation: "졸업여부",
  enrolled: "재학",
  graduated: "졸업",
  notes: "비고",
  photo: "학생 사진",
  cancel: "취소",
  submit: "신청/제출",
  submitting: "제출 중...",
  uploading: "사진 업로드 중...",
  pendingTitle: "승인 대기",
  cardSchool: "제주한라대학교",
  cardDepartment: "학과",
  cardMajor: "직속",
  cardStudentId: "학번",
  cardStatus: "상태",
  cardPhotoEmpty: "사진",
  opacityLabel: "배경·카드 투명도",
};

/** 정보 기입 폼에서 숨길 수 있는 항목 (학번·이름은 필수) */
export const STUDENT_FORM_FIELD_KEYS: SiteStudentFormFieldKey[] = [
  "department",
  "major",
  "studentId",
  "name",
  "phone",
  "graduation",
  "notes",
  "photo",
];

export const STUDENT_FORM_REQUIRED_KEYS: SiteStudentFormFieldKey[] = ["studentId", "name"];

export const STUDENT_FORM_FIELD_META: Array<{
  key: SiteStudentFormFieldKey;
  adminLabel: string;
  required?: boolean;
}> = [
  { key: "department", adminLabel: "학과" },
  { key: "major", adminLabel: "직속(전공)" },
  { key: "studentId", adminLabel: "학번", required: true },
  { key: "name", adminLabel: "이름", required: true },
  { key: "phone", adminLabel: "연락처" },
  { key: "graduation", adminLabel: "졸업여부" },
  { key: "notes", adminLabel: "비고" },
  { key: "photo", adminLabel: "학생 사진" },
];

export const STUDENT_CHROME_LABEL_META: Array<{
  key: keyof SiteStudentUiLabels;
  adminLabel: string;
}> = [
  { key: "formTitle", adminLabel: "정보 기입 창 제목" },
  { key: "cancel", adminLabel: "취소 버튼" },
  { key: "submit", adminLabel: "신청/제출 버튼" },
  { key: "submitting", adminLabel: "제출 중 문구" },
  { key: "uploading", adminLabel: "사진 업로드 중 문구" },
  { key: "enrolled", adminLabel: "재학" },
  { key: "graduated", adminLabel: "졸업" },
  { key: "cardSchool", adminLabel: "학생증 학교명" },
  { key: "cardDepartment", adminLabel: "학생증 · 학과 라벨" },
  { key: "cardMajor", adminLabel: "학생증 · 직속 라벨" },
  { key: "cardStudentId", adminLabel: "학생증 · 학번 라벨" },
  { key: "cardStatus", adminLabel: "학생증 · 상태 라벨" },
  { key: "cardPhotoEmpty", adminLabel: "학생증 · 사진 없음" },
  { key: "opacityLabel", adminLabel: "투명도 설정 라벨" },
];

export type SiteStudentAuthDisplay = {
  enabled: boolean;
  pwaSwipeEnabled: boolean;
  cardTitle: string;
  guideTitle: string;
  guideBody: string;
  guideImageUrl: string | null;
  authButtonLabel: string;
  pendingMessage: string;
  sheetsSpreadsheetId: string | null;
  sheetsLogTab: string;
  sheetsApprovalTab: string;
  labels: SiteStudentUiLabels;
  hiddenFormFields: SiteStudentFormFieldKey[];
  customFields: SiteStudentCustomField[];
};

export type SiteStudentAuthSettingsPick = Pick<
  SiteSettings,
  | "site_student_id_enabled"
  | "site_student_id_pwa_swipe_enabled"
  | "site_student_id_card_title"
  | "site_student_auth_guide_title"
  | "site_student_auth_guide_body"
  | "site_student_auth_guide_image_url"
  | "site_student_auth_button_label"
  | "site_student_sheets_spreadsheet_id"
  | "site_student_sheets_log_tab"
  | "site_student_sheets_approval_tab"
  | "site_student_pending_message"
  | "site_student_ui_labels"
>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function normalizeSiteStudentUiLabels(value: unknown): SiteStudentUiLabels {
  const record = asRecord(value) ?? {};
  const pick = (key: keyof SiteStudentUiLabels) => {
    const raw = record[key];
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim();
    }
    return DEFAULT_STUDENT_UI_LABELS[key];
  };

  return {
    formTitle: pick("formTitle"),
    department: pick("department"),
    major: pick("major"),
    studentId: pick("studentId"),
    name: pick("name"),
    phone: pick("phone"),
    graduation: pick("graduation"),
    enrolled: pick("enrolled"),
    graduated: pick("graduated"),
    notes: pick("notes"),
    photo: pick("photo"),
    cancel: pick("cancel"),
    submit: pick("submit"),
    submitting: pick("submitting"),
    uploading: pick("uploading"),
    pendingTitle: pick("pendingTitle"),
    cardSchool: pick("cardSchool"),
    cardDepartment: pick("cardDepartment"),
    cardMajor: pick("cardMajor"),
    cardStudentId: pick("cardStudentId"),
    cardStatus: pick("cardStatus"),
    cardPhotoEmpty: pick("cardPhotoEmpty"),
    opacityLabel: pick("opacityLabel"),
  };
}

export function normalizeHiddenFormFields(value: unknown): SiteStudentFormFieldKey[] {
  const record = asRecord(value) ?? {};
  const raw = record.hiddenFormFields;
  if (!Array.isArray(raw)) {
    return [];
  }
  const allowed = new Set<string>(STUDENT_FORM_FIELD_KEYS);
  const required = new Set<string>(STUDENT_FORM_REQUIRED_KEYS);
  const result: SiteStudentFormFieldKey[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !allowed.has(item) || required.has(item)) {
      continue;
    }
    if (!result.includes(item as SiteStudentFormFieldKey)) {
      result.push(item as SiteStudentFormFieldKey);
    }
  }
  return result;
}

export function normalizeCustomFields(value: unknown): SiteStudentCustomField[] {
  const record = asRecord(value) ?? {};
  const raw = record.customFields;
  if (!Array.isArray(raw)) {
    return [];
  }
  const result: SiteStudentCustomField[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!id || !label) {
      continue;
    }
    result.push({ id, label });
  }
  return result;
}

/** 관리자 편집용 — 저장된 값만 보여주고, 비어 있으면 빈 문자열 */
export function getEditableSiteStudentUiLabels(
  value: unknown,
): Record<keyof SiteStudentUiLabels, string> {
  const record = asRecord(value) ?? {};
  const keys = Object.keys(DEFAULT_STUDENT_UI_LABELS) as Array<keyof SiteStudentUiLabels>;
  const result = {} as Record<keyof SiteStudentUiLabels, string>;
  for (const key of keys) {
    const raw = record[key];
    result[key] = typeof raw === "string" ? raw : "";
  }
  return result;
}

export function serializeSiteStudentUiLabels(input: {
  labels: Record<keyof SiteStudentUiLabels, string>;
  hiddenFormFields: SiteStudentFormFieldKey[];
  customFields: SiteStudentCustomField[];
}): SiteStudentUiLabelsStored | null {
  const next: SiteStudentUiLabelsStored = {};
  let hasAny = false;

  for (const key of Object.keys(DEFAULT_STUDENT_UI_LABELS) as Array<keyof SiteStudentUiLabels>) {
    const trimmed = input.labels[key]?.trim() ?? "";
    if (trimmed) {
      next[key] = trimmed;
      hasAny = true;
    }
  }

  const hidden = normalizeHiddenFormFields({
    hiddenFormFields: input.hiddenFormFields,
  });
  if (hidden.length > 0) {
    next.hiddenFormFields = hidden;
    hasAny = true;
  }

  const custom = input.customFields
    .map((field) => ({
      id: field.id.trim(),
      label: field.label.trim(),
    }))
    .filter((field) => field.id && field.label);
  if (custom.length > 0) {
    next.customFields = custom;
    hasAny = true;
  }

  return hasAny ? next : null;
}

export function isStudentFormFieldVisible(
  key: SiteStudentFormFieldKey,
  hiddenFormFields: SiteStudentFormFieldKey[],
): boolean {
  if (STUDENT_FORM_REQUIRED_KEYS.includes(key)) {
    return true;
  }
  return !hiddenFormFields.includes(key);
}

export function getSiteStudentAuthDisplay(
  settings?: SiteStudentAuthSettingsPick | null,
): SiteStudentAuthDisplay {
  return {
    enabled: settings?.site_student_id_enabled ?? false,
    pwaSwipeEnabled: settings?.site_student_id_pwa_swipe_enabled ?? true,
    cardTitle: settings?.site_student_id_card_title?.trim() || DEFAULT_STUDENT_CARD_TITLE,
    guideTitle:
      settings?.site_student_auth_guide_title?.trim() || DEFAULT_STUDENT_AUTH_GUIDE_TITLE,
    guideBody:
      settings?.site_student_auth_guide_body?.trim() || DEFAULT_STUDENT_AUTH_GUIDE_BODY,
    guideImageUrl: settings?.site_student_auth_guide_image_url?.trim() || null,
    authButtonLabel:
      settings?.site_student_auth_button_label?.trim() || DEFAULT_STUDENT_AUTH_BUTTON_LABEL,
    pendingMessage:
      settings?.site_student_pending_message?.trim() || DEFAULT_STUDENT_PENDING_MESSAGE,
    sheetsSpreadsheetId: settings?.site_student_sheets_spreadsheet_id?.trim() || null,
    sheetsLogTab:
      settings?.site_student_sheets_log_tab?.trim() || DEFAULT_STUDENT_SHEETS_LOG_TAB,
    sheetsApprovalTab:
      settings?.site_student_sheets_approval_tab?.trim() || DEFAULT_STUDENT_SHEETS_APPROVAL_TAB,
    labels: normalizeSiteStudentUiLabels(settings?.site_student_ui_labels),
    hiddenFormFields: normalizeHiddenFormFields(settings?.site_student_ui_labels),
    customFields: normalizeCustomFields(settings?.site_student_ui_labels),
  };
}

export function markStudentAuthIntent() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(SITE_STUDENT_AUTH_INTENT_KEY, "1");
  } catch {
    // ignore
  }
}

export function consumeStudentAuthIntent(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const value = sessionStorage.getItem(SITE_STUDENT_AUTH_INTENT_KEY);
    sessionStorage.removeItem(SITE_STUDENT_AUTH_INTENT_KEY);
    return value === "1";
  } catch {
    return false;
  }
}

export function requestStudentLoginModal() {
  if (typeof window === "undefined") {
    return;
  }
  markStudentAuthIntent();
  window.dispatchEvent(new Event(SITE_STUDENT_NEED_LOGIN_EVENT));
}
