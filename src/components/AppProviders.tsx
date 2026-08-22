"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import PromptModalProvider from "@/components/PromptModalProvider";
import SitePwaFoldViewportApplier from "@/components/SitePwaFoldViewportApplier";
import { SiteAppBackProvider } from "@/lib/app-back-stack";

function useSessionCheck(intervalMs = 1000) {
  const router = useRouter();

  useEffect(() => {
    async function verify() {
      const studentId = localStorage.getItem("studentId");
      const sessionToken = localStorage.getItem("sessionToken");

      if (!studentId || !sessionToken) return;

      try {
        const res = await fetch("/api/auth/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, sessionToken }),
        });

        const data = await res.json();
        if (!data.valid) {
          alert("다른 기기에서 로그인되어 로그아웃되었습니다.");
          localStorage.clear();
          router.push("/login");
        }
      } catch (err) {
        console.error("세션 검증 오류:", err);
      }
    }

    verify();
    const timer = setInterval(verify, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
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