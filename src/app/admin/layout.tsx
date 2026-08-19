import type { Metadata } from "next";
import { AdminPwaRuntime } from "@/components/AdminPwaRuntime";
import { SupabaseConfigProvider } from "@/components/SupabaseConfigProvider";
import { getServerSupabaseConfigured } from "@/lib/supabase-env";
import { buildSiteMetadata } from "@/lib/site-metadata";
import {
  getPublicAdminPwaSettings,
  getPublicSiteSettingsForMetadata,
} from "@/lib/site-settings-server";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettingsForMetadata();
  const base = buildSiteMetadata(settings, "/admin");

  return {
    ...base,
    title: "제주한라대 제휴 시스템 관리자",
    openGraph: {
      ...base.openGraph,
      title: "제주한라대 제휴 시스템 관리자",
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const serverConfigured = getServerSupabaseConfigured();
  const adminPwaSettings = await getPublicAdminPwaSettings();

  return (
    <SupabaseConfigProvider serverConfigured={serverConfigured}>
      <AdminPwaRuntime settings={adminPwaSettings}>{children}</AdminPwaRuntime>
    </SupabaseConfigProvider>
  );
}
