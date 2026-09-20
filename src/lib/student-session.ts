import { getBoardVoterKey } from "@/lib/board-voter";
import { getSiteMemberSession } from "@/lib/site-member-session";
import { SESSION_TOKEN_HEADER, STUDENT_ID_HEADER } from "@/lib/student-session-headers";

function claimDailyLoginRewardClient(studentId: string, sessionToken: string) {
  const clientKey = getBoardVoterKey();
  void fetch("/api/student/login-reward", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [STUDENT_ID_HEADER]: studentId,
      [SESSION_TOKEN_HEADER]: sessionToken,
    },
    body: JSON.stringify({
      studentId,
      clientKey: clientKey !== "server" ? clientKey : "",
    }),
  }).catch(() => {});
}

let ensurePromise: Promise<boolean> | null = null;

export function storeStudentApiSession(studentId: string, sessionToken: string) {
  if (typeof window === "undefined") {
    return;
  }
  const id = studentId.trim();
  const token = sessionToken.trim();
  if (!id || !token) {
    return;
  }
  window.localStorage.setItem("studentId", id);
  window.localStorage.setItem("sessionToken", token);
  void claimDailyLoginRewardClient(id, token);
}

export function getStudentSessionAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }
  const sessionStudentId = getSiteMemberSession()?.student?.studentId?.trim() || "";
  const storedId = window.localStorage.getItem("studentId")?.trim() || "";
  const studentId = sessionStudentId || storedId;
  const sessionToken = window.localStorage.getItem("sessionToken")?.trim() || "";
  if (!studentId || !sessionToken) {
    return {};
  }
  if (sessionStudentId && storedId && sessionStudentId !== storedId) {
    return {};
  }
  return {
    [STUDENT_ID_HEADER]: studentId,
    [SESSION_TOKEN_HEADER]: sessionToken,
  };
}

export async function ensureStudentApiSession(force = false): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  if (ensurePromise) {
    return ensurePromise;
  }

  const student = getSiteMemberSession()?.student;
  const studentId = student?.studentId?.trim() || "";
  if (!studentId) {
    return false;
  }
  const existingId = window.localStorage.getItem("studentId")?.trim() || "";
  const existingToken = window.localStorage.getItem("sessionToken")?.trim() || "";
  if (!force && existingId === studentId && existingToken) {
    void claimDailyLoginRewardClient(existingId, existingToken);
    return true;
  }

  const run = (async () => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        name: student?.name?.trim() || studentId,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      session?: { studentId?: string; sessionToken?: string };
    } | null;
    const nextId = payload?.session?.studentId?.trim() || "";
    const nextToken = payload?.session?.sessionToken?.trim() || "";
    if (!response.ok || !payload?.ok || !nextId || !nextToken) {
      return false;
    }
    storeStudentApiSession(nextId, nextToken);
    return true;
  })();

  ensurePromise = run;
  try {
    return await run;
  } finally {
    if (ensurePromise === run) {
      ensurePromise = null;
    }
  }
}

export async function studentAuthFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  await ensureStudentApiSession();
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(getStudentSessionAuthHeaders())) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }
  const response = await fetch(input, { ...init, headers });
  if (response.status !== 401) {
    return response;
  }
  const refreshed = await ensureStudentApiSession(true);
  if (!refreshed) {
    return response;
  }
  const retryHeaders = new Headers(init.headers);
  for (const [key, value] of Object.entries(getStudentSessionAuthHeaders())) {
    if (!retryHeaders.has(key)) {
      retryHeaders.set(key, value);
    }
  }
  return fetch(input, { ...init, headers: retryHeaders });
}
