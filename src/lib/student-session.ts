export const STUDENT_ID_HEADER = "x-student-id";
export const SESSION_TOKEN_HEADER = "x-session-token";

export function getStudentSessionAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }
  const studentId = window.localStorage.getItem("studentId")?.trim() || "";
  const sessionToken = window.localStorage.getItem("sessionToken")?.trim() || "";
  if (!studentId || !sessionToken) {
    return {};
  }
  return {
    [STUDENT_ID_HEADER]: studentId,
    [SESSION_TOKEN_HEADER]: sessionToken,
  };
}

export function studentAuthFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(getStudentSessionAuthHeaders())) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }
  return fetch(input, { ...init, headers });
}
