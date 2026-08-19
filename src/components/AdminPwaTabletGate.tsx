"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ADMIN_PWA_MIN_VIEWPORT_WIDTH,
  shouldBlockAdminPwaOnSmallViewport,
} from "@/lib/site-admin-pwa";

type AdminPwaTabletGateProps = {
  children: ReactNode;
};

export default function AdminPwaTabletGate({ children }: AdminPwaTabletGateProps) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    function syncGate() {
      setBlocked(shouldBlockAdminPwaOnSmallViewport());
    }

    syncGate();
    window.addEventListener("resize", syncGate);
    return () => window.removeEventListener("resize", syncGate);
  }, []);

  if (blocked) {
    return (
      <div className="admin-pwa-tablet-gate">
        <div className="admin-pwa-tablet-gate__card">
          <h1 className="admin-pwa-tablet-gate__title">태블릿 전용 관리자 앱</h1>
          <p className="admin-pwa-tablet-gate__desc">
            관리자 앱은 갤럭시탭·폴드 펼침 등 가로 {ADMIN_PWA_MIN_VIEWPORT_WIDTH}px 이상 화면에서
            이용해 주세요.
          </p>
          <p className="admin-pwa-tablet-gate__hint">
            스마트폰에서는 브라우저로 <strong>/admin</strong> 페이지를 열어 이용할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
