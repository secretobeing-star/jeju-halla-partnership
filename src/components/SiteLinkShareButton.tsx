"use client";

import { useState } from "react";
import SiteToast from "@/components/SiteToast";
import { shareCurrentSiteLink } from "@/lib/site-analytics";

export default function SiteLinkShareButton({ dark }: { dark?: boolean }) {
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        className={`text-sm font-medium transition hover:opacity-90 ${dark ? "text-gray-200" : "text-gray-700"}`}
        onClick={() => {
          void shareCurrentSiteLink().then((result) => {
            if (result === "copied") setToast("링크를 복사했습니다.");
            if (result === "shared") setToast("링크를 공유했습니다.");
          });
        }}
      >
        링크 공유
      </button>
      {toast ? <SiteToast message={toast} onDismiss={() => setToast(null)} /> : null}
    </>
  );
}
