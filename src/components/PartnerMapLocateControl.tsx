"use client";

type PartnerMapLocateControlProps = {
  locating: boolean;
  locateMessage: string | null;
  onLocate: () => void;
  onRefresh?: () => void;
};

export default function PartnerMapLocateControl({
  locating,
  locateMessage,
  onLocate,
  onRefresh,
}: PartnerMapLocateControlProps) {
  return (
    <div className="partner-map-locate-control pointer-events-none absolute inset-0 z-[3]">
      {onRefresh ? (
        <button
          type="button"
          className="partner-map-locate-button partner-map-locate-button--refresh pointer-events-auto"
          aria-label="지도 새로고침"
          title="지도 새로고침"
          onClick={onRefresh}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden
          >
            <path d="M21 12a9 9 0 1 1-3.2-6.9" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      ) : null}
      <button
        type="button"
        className="partner-map-locate-button pointer-events-auto"
        aria-label="내 위치로 이동"
        title="내 위치"
        disabled={locating}
        onClick={onLocate}
      >
        {locating ? (
          <span className="partner-map-locate-button__spinner" aria-hidden />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3" />
            <path d="M12 19v3" />
            <path d="M2 12h3" />
            <path d="M19 12h3" />
          </svg>
        )}
      </button>
      {locateMessage ? (
        <p className="partner-map-locate-message pointer-events-none" role="status">
          {locateMessage}
        </p>
      ) : null}
    </div>
  );
}
