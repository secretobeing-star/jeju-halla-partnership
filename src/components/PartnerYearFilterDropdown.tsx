"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  formatPartnerYearLabel,
  type PartnerYearFilterValue,
} from "@/lib/partner-partnership-year";

type PartnerYearFilterDropdownProps = {
  value: PartnerYearFilterValue;
  years: number[];
  onChange: (value: PartnerYearFilterValue) => void;
};

function getYearFilterLabel(value: PartnerYearFilterValue): string {
  if (value === "전체") {
    return "전체";
  }

  return formatPartnerYearLabel(value);
}

export default function PartnerYearFilterDropdown({
  value,
  years,
  onChange,
}: PartnerYearFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const options: PartnerYearFilterValue[] = ["전체", ...years];

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`site-title-dropdown site-title-dropdown--partner-year${
        open ? " site-title-dropdown--open" : ""
      }`}
    >
      <div className="site-title-dropdown__shell">
        <button
          type="button"
          className="site-title-dropdown__trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className="site-title-dropdown__title">{getYearFilterLabel(value)}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="site-title-dropdown__chevron"
            aria-hidden
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        {open ? (
          <div id={menuId} role="menu" className="site-title-dropdown__menu">
            {options.map((option) => {
              const isSelected = option === value;

              return (
                <button
                  key={option === "전체" ? "all" : option}
                  type="button"
                  role="menuitem"
                  className={`site-title-dropdown__item${
                    isSelected ? " site-title-dropdown__item--selected" : ""
                  }`}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  <span className="site-title-dropdown__item-inner">
                    <span className="site-title-dropdown__item-label">
                      {getYearFilterLabel(option)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
