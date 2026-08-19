"use client";

type SiteTopToolbarProps = {
  children: React.ReactNode;
};

export default function SiteTopToolbar({ children }: SiteTopToolbarProps) {
  return <div className="site-top-toolbar">{children}</div>;
}
