import { readDeviceJson, writeDeviceJson } from "@/lib/device-storage";
import type {
  StudentApprovalStatus,
  StudentGraduationStatus,
} from "@/lib/site-student-auth-settings";
import { registerPushSubscription } from "@/lib/register-push";

export const SITE_MEMBER_SESSION_KEY = "jeju-halla-member-session";
export const SITE_MEMBER_SESSION_EVENT = "site-member-session-changed";

export type SiteMemberStudentProfile = {
  studentId: string;
  name: string;
  department: string;
  major: string;
  phone: string;
  graduationStatus: StudentGraduationStatus;
  photoUrl: string | null;
  notes: string | null;
  approvalStatus: StudentApprovalStatus;
};

export type SiteMemberSession = {
  provider: string;
  displayName: string;
  loggedInAt: string;
  student?: SiteMemberStudentProfile | null;
  provider_token?: string;
};

export function getSiteMemberSession(): SiteMemberSession | null {
  const session = readDeviceJson<SiteMemberSession | null>(SITE_MEMBER_SESSION_KEY, null);
  if (!session?.displayName?.trim()) {
    return null;
  }
  return session;
}

export function setSiteMemberSession(session: SiteMemberSession | null): void {
  if (session) {
    writeDeviceJson(SITE_MEMBER_SESSION_KEY, session);
    
    // 로그인 시 푸시 구독 등록
    const clientKey = session.displayName?.trim() || session.student?.studentId || "";
    if (clientKey) {
      void registerPushSubscription(clientKey);
    }
  } else {
    writeDeviceJson(SITE_MEMBER_SESSION_KEY, null);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SITE_MEMBER_SESSION_EVENT));
  }
}

export function clearSiteMemberSession(): void {
  setSiteMemberSession(null);
}

export function patchSiteMemberStudentProfile(
  student: SiteMemberStudentProfile | null,
): SiteMemberSession | null {
  const current = getSiteMemberSession();
  if (!current) {
    if (!student) {
      return null;
    }
    const next: SiteMemberSession = {
      provider: "student-auth",
      displayName: student.name,
      loggedInAt: new Date().toISOString(),
      student,
    };
    setSiteMemberSession(next);
    return next;
  }

  const next: SiteMemberSession = {
    ...current,
    displayName: student?.name?.trim() || current.displayName,
    student,
  };
  setSiteMemberSession(next);
  return next;
}
