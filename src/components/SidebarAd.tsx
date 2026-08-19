"use client";

import { useState } from "react";
import AdMediaContent from "@/components/AdMediaContent";

type SidebarAdProps = {
  imageUrl: string;
  linkUrl?: string | null;
  label: string;
};

export default function SidebarAd({ imageUrl, linkUrl, label }: SidebarAdProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  const media = (
    <AdMediaContent
      mediaUrl={imageUrl}
      label={label}
      className="sidebar-ad-media"
      hideOnError
      onLoadFailed={() => setVisible(false)}
    />
  );

  return (
    <div className="sidebar-ad">
      {linkUrl?.trim() ? (
        <a
          href={linkUrl.trim()}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-full transition hover:opacity-90"
        >
          {media}
        </a>
      ) : (
        media
      )}
    </div>
  );
}
