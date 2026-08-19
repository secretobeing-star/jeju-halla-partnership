import type { SiteSettings } from "@/lib/supabase";

export const DEFAULT_SITE_LOGIN_MODAL_TITLE = "로그인";
export const DEFAULT_SITE_LOGIN_PROVIDER_LABEL = "로그인하기";
export const DEFAULT_SITE_LOGIN_BUTTON_LABEL = "로그인";

export type SiteMemberLoginDisplay = {
  enabled: boolean;
  previewEnabled: boolean;
  modalTitle: string;
  noticeLine1: string;
  statusNotice: string;
  noticeLine2: string;
  buttonLabel: string;
  providerLabel: string;
  logoUrl: string | null;
};

export type SiteMemberFeaturesDisplay = {
  login: SiteMemberLoginDisplay;
  notificationsEnabled: boolean;
  pushEnabled: boolean;
  studentIdEnabled: boolean;
};

export function getSiteMemberLoginDisplay(
  settings?: Pick<
    SiteSettings,
    | "site_login_enabled"
    | "site_login_preview_enabled"
    | "site_login_modal_title"
    | "site_login_notice_line1"
    | "site_login_status_notice"
    | "site_login_notice_line2"
    | "site_login_button_label"
    | "site_login_provider_label"
    | "site_login_logo_url"
  > | null,
): SiteMemberLoginDisplay {
  return {
    enabled: settings?.site_login_enabled ?? false,
    previewEnabled: settings?.site_login_preview_enabled ?? false,
    modalTitle: settings?.site_login_modal_title?.trim() || DEFAULT_SITE_LOGIN_MODAL_TITLE,
    noticeLine1: settings?.site_login_notice_line1?.trim() ?? "",
    statusNotice: settings?.site_login_status_notice?.trim() ?? "",
    noticeLine2: settings?.site_login_notice_line2?.trim() ?? "",
    buttonLabel: settings?.site_login_button_label?.trim() || DEFAULT_SITE_LOGIN_BUTTON_LABEL,
    providerLabel:
      settings?.site_login_provider_label?.trim() || DEFAULT_SITE_LOGIN_PROVIDER_LABEL,
    logoUrl: settings?.site_login_logo_url?.trim() || null,
  };
}

export function getSiteMemberFeaturesDisplay(
  settings?: Pick<
    SiteSettings,
    | "site_login_enabled"
    | "site_login_preview_enabled"
    | "site_login_modal_title"
    | "site_login_notice_line1"
    | "site_login_status_notice"
    | "site_login_notice_line2"
    | "site_login_button_label"
    | "site_login_provider_label"
    | "site_login_logo_url"
    | "site_notifications_enabled"
    | "site_push_enabled"
    | "site_student_id_enabled"
  > | null,
): SiteMemberFeaturesDisplay {
  return {
    login: getSiteMemberLoginDisplay(settings),
    notificationsEnabled: settings?.site_notifications_enabled ?? false,
    pushEnabled: settings?.site_push_enabled ?? false,
    studentIdEnabled: settings?.site_student_id_enabled ?? false,
  };
}

export function shouldShowSiteHeaderActions(features: SiteMemberFeaturesDisplay): boolean {
  return features.login.enabled || features.notificationsEnabled || features.studentIdEnabled;
}
