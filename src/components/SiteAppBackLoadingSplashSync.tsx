"use client";

import { useLayoutEffect } from "react";
import {
  acquireSiteAppBackLoadingSplash,
  releaseSiteAppBackLoadingSplash,
} from "@/lib/app-back-stack";

type SiteAppBackLoadingSplashSyncProps = {
  active: boolean;
};

export default function SiteAppBackLoadingSplashSync({
  active,
}: SiteAppBackLoadingSplashSyncProps) {
  useLayoutEffect(() => {
    if (!active) {
      return;
    }

    acquireSiteAppBackLoadingSplash();
    return () => {
      releaseSiteAppBackLoadingSplash();
    };
  }, [active]);

  return null;
}
