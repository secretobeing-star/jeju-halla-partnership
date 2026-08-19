"use client";

import { ReactNode, useState } from "react";

const COLLAPSE_LABEL = {
  expanded: "\uC811\uAE30",
  collapsed: "\uD3BC\uCE58\uAE30",
} as const;

type AdminCollapsibleSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  headerActions?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
  contentClassName?: string;
  nested?: boolean;
};

export default function AdminCollapsibleSection({
  title,
  description,
  headerActions,
  defaultExpanded = true,
  children,
  contentClassName = "bg-white p-6",
  nested = false,
}: AdminCollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const wrapperClass = nested
    ? "overflow-hidden rounded-xl border border-gray-200 bg-white"
    : "overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100";

  return (
    <section className={wrapperClass}>
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {description ? (
            <div className="mt-0.5 text-xs text-gray-500">{description}</div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {headerActions}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
            aria-expanded={expanded}
          >
            {expanded ? COLLAPSE_LABEL.expanded : COLLAPSE_LABEL.collapsed}
          </button>
        </div>
      </div>
      {expanded ? <div className={contentClassName}>{children}</div> : null}
    </section>
  );
}
