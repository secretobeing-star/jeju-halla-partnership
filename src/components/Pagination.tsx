"use client";

import { useEffect, useMemo, useState } from "react";
import { scrollToSection } from "@/lib/scroll-to-section";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scrollToTopOnChange?: boolean;
  scrollTargetId?: string;
  scrollOffsetPx?: number;
};

const MOBILE_PAGE_WINDOW = 5;
const MOBILE_MQ = "(max-width: 767px)";

function pageWindow(currentPage: number, totalPages: number, size: number) {
  const start = Math.floor((Math.max(1, currentPage) - 1) / size) * size + 1;
  const end = Math.min(totalPages, start + size - 1);
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  scrollToTopOnChange = false,
  scrollTargetId,
  scrollOffsetPx = 12,
}: PaginationProps) {
  const [mobile, setMobile] = useState(true);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MQ);
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const pages = useMemo(() => {
    if (totalPages <= 1) return [];
    if (mobile) {
      return pageWindow(currentPage, totalPages, MOBILE_PAGE_WINDOW);
    }
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }, [currentPage, mobile, totalPages]);

  if (totalPages <= 1) {
    return null;
  }

  function handleChange(page: number) {
    onPageChange(page);

    if (scrollTargetId) {
      scrollToSection(scrollTargetId, scrollOffsetPx);
      return;
    }

    if (scrollToTopOnChange) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <nav
      aria-label="페이지 이동"
      className="site-main-width mx-auto mt-6 flex flex-wrap items-center justify-center gap-2"
    >
      <button
        type="button"
        onClick={() => handleChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        이전
      </button>

      {pages.map((page) => {
        const isActive = page === currentPage;

        return (
          <button
            key={page}
            type="button"
            onClick={() => handleChange(page)}
            aria-current={isActive ? "page" : undefined}
            className={`min-w-9 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-emerald-500 text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {page}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => handleChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        다음
      </button>
    </nav>
  );
}
