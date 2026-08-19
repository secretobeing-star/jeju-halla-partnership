"use client";

import { useEffect, useId, useRef, useState } from "react";

type SitePartnerSearchProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  placeholder?: string;
  inputId?: string;
  wrapClassName?: string;
  inputClassName?: string;
  iconToggle?: boolean;
  /** When true with iconToggle, the input expands on a full-width row below the icon. */
  expandBelow?: boolean;
  showLeadingIcon?: boolean;
  /** Fixed magnifying-glass icon beside the input (not a toggle). */
  iconAside?: boolean;
};

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="site-partner-search__icon"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export default function SitePartnerSearch({
  searchQuery,
  onSearchQueryChange,
  placeholder = "",
  inputId,
  wrapClassName = "",
  inputClassName = "",
  iconToggle = false,
  expandBelow = false,
  showLeadingIcon = true,
  iconAside = false,
}: SitePartnerSearchProps) {
  const generatedId = useId();
  const resolvedInputId = inputId ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);

  const hasQuery = searchQuery.trim().length > 0;
  const fieldOpen = expanded || hasQuery;
  const useBelowPanel = iconToggle && expandBelow;

  useEffect(() => {
    if (!expanded) {
      return;
    }

    inputRef.current?.focus();
  }, [expanded]);

  const searchInput = (
    <>
      <label className="sr-only" htmlFor={resolvedInputId}>
        제휴 업체 검색
      </label>
      <input
        ref={inputRef}
        id={resolvedInputId}
        type="search"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        placeholder={placeholder}
        className={inputClassName}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !hasQuery) {
            setExpanded(false);
          }
        }}
      />
    </>
  );

  return (
    <div
      className={[
        "site-partner-search",
        fieldOpen ? " site-partner-search--open" : "",
        hasQuery ? " site-partner-search--has-value" : "",
        iconToggle ? " site-partner-search--icon-toggle" : "",
        iconAside ? " site-partner-search--icon-aside" : "",
        useBelowPanel ? " site-partner-search--expand-below" : "",
        useBelowPanel && fieldOpen ? " site-partner-search--expand-below-open" : "",
        wrapClassName,
      ].join("")}
    >
      <button
        type="button"
        className="site-partner-search__toggle"
        aria-label="제휴 업체 검색"
        aria-expanded={fieldOpen}
        aria-controls={resolvedInputId}
        onClick={() => {
          setExpanded((current) => !current);
        }}
      >
        <SearchIcon />
      </button>
      {iconAside ? (
        <span className="site-partner-search__aside-icon" aria-hidden>
          <SearchIcon />
        </span>
      ) : null}
      {useBelowPanel ? (
        fieldOpen ? (
          <div className="site-partner-search__below-panel">
            <div className="site-partner-search__field">{searchInput}</div>
          </div>
        ) : null
      ) : (
        <div
          className={[
            "site-partner-search__field",
            !iconToggle && showLeadingIcon ? " site-partner-search__field--with-icon" : "",
          ].join("")}
        >
          {!iconToggle && showLeadingIcon ? (
            <span className="site-partner-search__leading-icon" aria-hidden>
              <SearchIcon />
            </span>
          ) : null}
          {searchInput}
        </div>
      )}
    </div>
  );
}
