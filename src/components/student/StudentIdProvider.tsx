"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import StudentAuthGuideModal from "@/components/student/StudentAuthGuideModal";
import StudentCardModal, {
  type StudentCardBrandDisplay,
} from "@/components/student/StudentCardModal";
import StudentInfoFormModal from "@/components/student/StudentInfoFormModal";
import StudentPendingModal from "@/components/student/StudentPendingModal";
import StudentSamsungPaySwipe from "@/components/student/StudentSamsungPaySwipe";
import { useStandaloneDisplayMode } from "@/hooks/useStandaloneDisplayMode";
import {
  getSiteMemberSession,
  patchSiteMemberStudentProfile,
  SITE_MEMBER_SESSION_EVENT,
  type SiteMemberStudentProfile,
} from "@/lib/site-member-session";
import type { SiteMemberLoginDisplay } from "@/lib/site-member-settings";
import {
  consumeStudentAuthIntent,
  requestStudentLoginModal,
  type SiteStudentAuthDisplay,
} from "@/lib/site-student-auth-settings";
import type { PublicCardFrameItem } from "@/lib/student-card-frames";

type FlowStep = "idle" | "guide" | "form" | "pending" | "card";

type StudentIdContextValue = {
  enabled: boolean;
  authButtonLabel: string;
  studentIdLabel: string;
  cardTitle: string;
  openStudentId: () => void;
  startStudentAuth: () => void;
  continueAfterLogin: () => void;
  /** 학번 로그인 성공 후 학생증 카드 표시 */
  openStudentCardFromSession: () => void;
};

const StudentIdContext = createContext<StudentIdContextValue>({
  enabled: false,
  authButtonLabel: "제주한라대 인증하기",
  studentIdLabel: "학번",
  cardTitle: "학생증",
  openStudentId: () => {},
  startStudentAuth: () => {},
  continueAfterLogin: () => {},
  openStudentCardFromSession: () => {},
});

export function useStudentIdEntry() {
  return useContext(StudentIdContext);
}

type StudentIdProviderProps = {
  children?: ReactNode;
  authDisplay: SiteStudentAuthDisplay;
  loginDisplay: SiteMemberLoginDisplay;
  cardFrames?: PublicCardFrameItem[];
  cardBrand?: StudentCardBrandDisplay;
  /** PWA 로딩 스플래시 등 — 제스처로 학생증이 열리지 않게 */
  lockGestures?: boolean;
};

export default function StudentIdProvider({
  children,
  authDisplay,
  loginDisplay,
  cardFrames = [],
  cardBrand,
  lockGestures = false,
}: StudentIdProviderProps) {
  const standalone = useStandaloneDisplayMode();
  const [step, setStep] = useState<FlowStep>("idle");
  const [student, setStudent] = useState<SiteMemberStudentProfile | null>(null);
  const [pendingMessageOverride, setPendingMessageOverride] = useState<string | null>(null);

  const refreshSession = useCallback(() => {
    const session = getSiteMemberSession();
    setStudent(session?.student ?? null);
  }, []);

  useEffect(() => {
    refreshSession();
    window.addEventListener(SITE_MEMBER_SESSION_EVENT, refreshSession);
    return () => window.removeEventListener(SITE_MEMBER_SESSION_EVENT, refreshSession);
  }, [refreshSession]);

  const refreshApproval = useCallback(async (profile: SiteMemberStudentProfile) => {
    try {
      const response = await fetch(
        `/api/student/status?studentId=${encodeURIComponent(profile.studentId)}`,
      );
      if (!response.ok) {
        return profile;
      }
      const payload = (await response.json()) as {
        status?: SiteMemberStudentProfile["approvalStatus"];
        student?: {
          name?: string | null;
          photoUrl?: string | null;
          department?: string | null;
          major?: string | null;
          approvalStatus?: SiteMemberStudentProfile["approvalStatus"];
        };
      };

      const next: SiteMemberStudentProfile = {
        ...profile,
        approvalStatus: payload.status ?? payload.student?.approvalStatus ?? profile.approvalStatus,
        name: payload.student?.name?.trim() || profile.name,
        photoUrl: payload.student?.photoUrl?.trim() || profile.photoUrl,
        department: payload.student?.department?.trim() || profile.department,
        major: payload.student?.major?.trim() || profile.major,
      };
      patchSiteMemberStudentProfile(next);
      setStudent(next);
      return next;
    } catch {
      return profile;
    }
  }, []);

  const startStudentAuth = useCallback(() => {
    if (!authDisplay.enabled) {
      return;
    }
    setStep("guide");
  }, [authDisplay.enabled]);

  const continueAfterLogin = useCallback(() => {
    if (!authDisplay.enabled) {
      return;
    }
    if (consumeStudentAuthIntent()) {
      setStep("guide");
    }
  }, [authDisplay.enabled]);

  const openStudentCardFromSession = useCallback(() => {
    if (lockGestures) {
      return;
    }
    const session = getSiteMemberSession();
    const profile = session?.student ?? null;
    if (!profile || profile.approvalStatus !== "approved") {
      return;
    }
    setStudent(profile);
    setStep("card");
  }, [lockGestures]);

  const openStudentId = useCallback(async () => {
    if (!authDisplay.enabled || lockGestures) {
      return;
    }

    const session = getSiteMemberSession();
    let profile = session?.student ?? null;

    if (profile?.studentId) {
      profile = await refreshApproval(profile);
    }

    if (profile?.approvalStatus === "approved") {
      setStudent(profile);
      setStep("card");
      return;
    }

    if (profile?.approvalStatus === "pending") {
      setStudent(profile);
      setStep("pending");
      return;
    }

    // 로그인 기능과 통합: 미로그인 시 헤더 로그인 모달만 사용
    if (loginDisplay.enabled && !session) {
      requestStudentLoginModal();
      return;
    }

    setStep("guide");
  }, [authDisplay.enabled, lockGestures, loginDisplay.enabled, refreshApproval]);

  const approvedStudent =
    student?.approvalStatus === "approved"
      ? student
      : getSiteMemberSession()?.student?.approvalStatus === "approved"
        ? getSiteMemberSession()?.student
        : null;

  const swipeEnabled =
    authDisplay.enabled &&
    authDisplay.pwaSwipeEnabled &&
    standalone &&
    Boolean(approvedStudent) &&
    !lockGestures;

  const closeAll = useCallback(() => {
    setStep("idle");
    setPendingMessageOverride(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      enabled: authDisplay.enabled,
      authButtonLabel: authDisplay.authButtonLabel,
      studentIdLabel: authDisplay.labels.studentId,
      cardTitle: authDisplay.cardTitle,
      openStudentId: () => {
        void openStudentId();
      },
      startStudentAuth,
      continueAfterLogin,
      openStudentCardFromSession,
    }),
    [
      authDisplay.enabled,
      authDisplay.authButtonLabel,
      authDisplay.labels.studentId,
      authDisplay.cardTitle,
      openStudentId,
      startStudentAuth,
      continueAfterLogin,
      openStudentCardFromSession,
    ],
  );

  return (
    <StudentIdContext.Provider value={contextValue}>
      {children}

      <StudentSamsungPaySwipe
        enabled={swipeEnabled}
        cardOpen={step === "card"}
        onOpen={() => {
          void openStudentId();
        }}
      />

      <StudentAuthGuideModal
        open={step === "guide"}
        onClose={closeAll}
        onConfirm={() => setStep("form")}
        title={authDisplay.guideTitle}
        body={authDisplay.guideBody}
        imageUrl={authDisplay.guideImageUrl}
      />

      <StudentInfoFormModal
        open={step === "form"}
        onClose={closeAll}
        labels={authDisplay.labels}
        hiddenFormFields={authDisplay.hiddenFormFields}
        customFields={authDisplay.customFields}
        onSubmitted={(next) => {
          patchSiteMemberStudentProfile(next);
          setStudent(next);
          setPendingMessageOverride(null);
          if (next.approvalStatus === "approved") {
            setStep("card");
            return;
          }
          setStep("pending");
        }}
        onDuplicatePending={(next, message) => {
          patchSiteMemberStudentProfile(next);
          setStudent(next);
          setPendingMessageOverride(message);
          setStep("pending");
        }}
      />

      <StudentPendingModal
        open={step === "pending"}
        onClose={closeAll}
        title={authDisplay.labels.pendingTitle}
        message={pendingMessageOverride || authDisplay.pendingMessage}
      />

      {student ? (
        <StudentCardModal
          open={step === "card"}
          onClose={closeAll}
          title={authDisplay.cardTitle}
          student={student}
          labels={authDisplay.labels}
          brand={cardBrand}
          cardFrames={cardFrames}
          onPhotoChange={async (photoUrl) => {
            const next: SiteMemberStudentProfile = { ...student, photoUrl };
            setStudent(next);
            patchSiteMemberStudentProfile(next);

            try {
              const response = await fetch("/api/student/photo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  studentId: student.studentId,
                  photoUrl,
                }),
              });
              if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as {
                  error?: string;
                } | null;
                throw new Error(payload?.error || "시트에 사진을 저장하지 못했습니다.");
              }
            } catch (error) {
              // 로컬 카드에는 반영된 상태로 두고, 시트 실패만 상위로 전달
              throw error instanceof Error
                ? error
                : new Error("시트에 사진을 저장하지 못했습니다.");
            }
          }}
        />
      ) : null}
    </StudentIdContext.Provider>
  );
}
