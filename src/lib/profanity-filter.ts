/** Shared user-content profanity check (board / comments / reviews). */

export const PROFANITY_BLOCKED_MESSAGE =
  "부적절한 표현이 포함되어 있습니다. 수정 후 다시 등록해 주세요.";

export const PROFANITY_BLOCKED_CODE = "profanity" as const;

/** Multi-character terms only — avoid single-syllable false positives. */
const PROFANITY_TERMS = [
  "시발",
  "씨발",
  "씨팔",
  "시팔",
  "시벌",
  "씨벌",
  "병신",
  "븅신",
  "지랄",
  "좆",
  "존나",
  "ㅈㄴ",
  "ㅅㅂ",
  "ㅂㅅ",
  "ㅈㄹ",
  "꺼져",
  "닥쳐",
  "개새",
  "개색",
  "새끼야",
  "느금마",
  "느금",
  "엠창",
  "애미",
  "애비",
  "니미",
  "니애미",
  "니애비",
  "씨발놈",
  "씨발년",
  "개같",
  "미친놈",
  "미친년",
  "창녀",
  "걸레년",
  "섹스해",
  "fuck",
  "fucking",
  "shit",
  "bitch",
  "asshole",
  "motherfucker",
  "dickhead",
  "cunt",
] as const;

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#\d+;/g, " ");
}

/** Collapse separators so "시 발" / "시.발" still match. */
export function normalizeProfanityText(value: string): string {
  return stripHtml(value)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[0oｏ]/g, "o")
    .replace(/[^\p{L}\p{N}\p{Script=Hangul}]/gu, "");
}

export function findProfanityMatch(...parts: Array<string | null | undefined>): string | null {
  const normalized = normalizeProfanityText(parts.filter(Boolean).join(" "));
  if (!normalized) {
    return null;
  }

  for (const term of PROFANITY_TERMS) {
    const needle = normalizeProfanityText(term);
    if (needle && normalized.includes(needle)) {
      return term;
    }
  }

  return null;
}

export function containsProfanity(...parts: Array<string | null | undefined>): boolean {
  return findProfanityMatch(...parts) !== null;
}

export function isProfanityBlockedError(message: string): boolean {
  return (
    message.includes(PROFANITY_BLOCKED_MESSAGE) ||
    message.includes("부적절한 표현이 포함") ||
    message.toLowerCase().includes("profanity")
  );
}

export function profanityBlockedResponse() {
  return {
    error: PROFANITY_BLOCKED_MESSAGE,
    error_code: PROFANITY_BLOCKED_CODE,
  };
}
