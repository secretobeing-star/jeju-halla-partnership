import { scrollToSection } from "@/lib/scroll-to-section";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scrollToTopOnChange?: boolean;
  scrollTargetId?: string;
  scrollOffsetPx?: number;
};

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  scrollToTopOnChange = false,
  scrollTargetId,
  scrollOffsetPx = 12,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

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
