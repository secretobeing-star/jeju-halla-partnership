"use client";

import { ReactNode } from "react";

type TabletSplitLayoutProps = {
  master: ReactNode;
  detail: ReactNode;
  className?: string;
};

export default function TabletSplitLayout({
  master,
  detail,
  className = "",
}: TabletSplitLayoutProps) {
  return (
    <div className={["tablet-split-layout", className].filter(Boolean).join(" ")}>
      <div className="tablet-split-layout__master modal-slim-scroll">{master}</div>
      <div className="tablet-split-layout__detail">{detail}</div>
    </div>
  );
}
