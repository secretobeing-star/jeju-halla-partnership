"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useSessionCheck(intervalMs = 30000) {
  const router = useRouter();

  useEffect(() => {
    async function verify() {
      const studentId = localStorage.getItem("studentId");
      const sessionToken = localStorage.getItem("sessionToken");

      // 로그인 상태가 아니라면 검증 스킵
      if (!studentId || !sessionToken) return;

      try {
        const res = await fetch("/api/auth/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, sessionToken }),
        });

        const data = await res.json();

        if (!data.valid) {
          alert(data.message || "다른 기기에서 로그인하여 로그아웃되었습니다.");
          localStorage.clear(); // 로컬스토리지 전체 정리
          router.push("/login"); // 로그인 페이지로 이동
        }
      } catch (err) {
        console.error("세션 검증 중 오류 발생:", err);
      }
    }

    // 1. 컴포넌트 마운트 시 즉시 검증
    verify();

    // 2. 일정 주기(기본 30초)마다 백그라운드에서 검증
    const timer = setInterval(verify, intervalMs);

    return () => clearInterval(timer);
  }, [router, intervalMs]);
}