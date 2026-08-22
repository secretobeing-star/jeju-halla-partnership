"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import PromptModalProvider from "@/components/PromptModalProvider";
import SitePwaFoldViewportApplier from "@/components/SitePwaFoldViewportApplier";
import { SiteAppBackProvider } from "@/lib/app-back-stack";

// 1초마다 다른 기기 로그인 여부를 검증하는 훅
function useSessionCheck(intervalMs = 1000) {
  const router = useRouter();

  useEffect(() => {
    async function verify() {
      const studentId = localStorage.getItem("studentId");
      const sessionToken = localStorage.getItem("sessionToken");

      // 콘솔 로그 추가: 실제 값이 잘 불러와지는지 확인
      console.log("세션 검증 시도 중...", { studentId, sessionToken });

      if (!studentId || !sessionToken) return;

      try {
        const res = await fetch("/api/auth/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, sessionToken }),
        });

        const data = await res.json();
        
        // 콘솔 로그 추가: 서버 응답 결과 확인
        console.log("서버 검증 결과:", data);

        if (!data.valid) {
          console.warn("로그아웃 조건 충족: 강제 로그아웃 수행");
          alert(data.message || "다른 기기에서 로그인하여 로그아웃되었습니다.");
          localStorage.clear();
          router.push("/login");
        }
      } catch (err) {
        console.error("세션 검증 통신 오류:", err);
      }
    }

    verify();
    const timer = setInterval(verify, intervalMs);

    return () => clearInterval(timer);
  }, [router, intervalMs]);
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  // 1초마다 중복 로그인 감지 실행
  useSessionCheck(1000);

  return (
    <SiteAppBackProvider>
      <PromptModalProvider>
        <SitePwaFoldViewportApplier />
        {children}
      </PromptModalProvider>
    </SiteAppBackProvider>
  );
}