"use client";

import { SiteSettings } from "@/lib/supabase";

type PermissionPlatform = "android" | "ios";

type SitePwaPermissionSettingsAdminFieldsProps = {
  platform: PermissionPlatform;
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
};

type FieldKey = keyof SiteSettings;

const GROUPS: Array<{
  label: string;
  titleKey: { android: FieldKey; ios: FieldKey };
  messageKey: { android: FieldKey; ios: FieldKey };
  messageOnly?: boolean;
}> = [
  {
    label: "알림 · 최초 실행 (권한 요청)",
    titleKey: {
      android: "site_pwa_permission_notification_request_title",
      ios: "site_pwa_permission_notification_request_title_ios",
    },
    messageKey: {
      android: "site_pwa_permission_notification_request_message",
      ios: "site_pwa_permission_notification_request_message_ios",
    },
  },
  {
    label: "알림 · 최초 실행 (거부됨)",
    titleKey: {
      android: "site_pwa_permission_notification_denied_title",
      ios: "site_pwa_permission_notification_denied_title_ios",
    },
    messageKey: {
      android: "site_pwa_permission_notification_denied_message",
      ios: "site_pwa_permission_notification_denied_message_ios",
    },
  },
  {
    label: "위치 · 최초 실행 (권한 요청)",
    titleKey: {
      android: "site_pwa_permission_location_request_title",
      ios: "site_pwa_permission_location_request_title_ios",
    },
    messageKey: {
      android: "site_pwa_permission_location_request_message",
      ios: "site_pwa_permission_location_request_message_ios",
    },
  },
  {
    label: "위치 · 최초 실행 (거부됨)",
    titleKey: {
      android: "site_pwa_permission_location_denied_title",
      ios: "site_pwa_permission_location_denied_title_ios",
    },
    messageKey: {
      android: "site_pwa_permission_location_denied_message",
      ios: "site_pwa_permission_location_denied_message_ios",
    },
  },
  {
    label: "앱 설정 · 알림 거부 안내",
    titleKey: {
      android: "site_pwa_permission_app_notification_denied_message",
      ios: "site_pwa_permission_app_notification_denied_message_ios",
    },
    messageKey: {
      android: "site_pwa_permission_app_notification_denied_message",
      ios: "site_pwa_permission_app_notification_denied_message_ios",
    },
    messageOnly: true,
  },
  {
    label: "앱 설정 · 위치 거부 안내",
    titleKey: {
      android: "site_pwa_permission_app_location_denied_message",
      ios: "site_pwa_permission_app_location_denied_message_ios",
    },
    messageKey: {
      android: "site_pwa_permission_app_location_denied_message",
      ios: "site_pwa_permission_app_location_denied_message_ios",
    },
    messageOnly: true,
  },
];

export default function SitePwaPermissionSettingsAdminFields({
  platform,
  settings,
  onChange,
}: SitePwaPermissionSettingsAdminFieldsProps) {
  function updateField(key: FieldKey, value: string) {
    onChange({
      [key]: value.trim() ? value : null,
    } as Partial<SiteSettings>);
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-800">
        {platform === "android" ? "Android (Galaxy 등)" : "iPhone / iPad"}
      </p>

      {GROUPS.map((group) => {
        const titleKey = group.titleKey[platform];
        const messageKey = group.messageKey[platform];
        const titleValue = (settings[titleKey] as string | null | undefined) ?? "";
        const messageValue = (settings[messageKey] as string | null | undefined) ?? "";

        return (
          <div
            key={`${platform}-${group.label}`}
            className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3"
          >
            <p className="text-xs font-medium text-gray-700">{group.label}</p>

            {group.messageOnly ? (
              <label className="block text-sm font-medium text-gray-700">
                안내 문구
                <textarea
                  value={messageValue}
                  onChange={(event) => updateField(messageKey, event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-700">
                  제목
                  <input
                    value={titleValue}
                    onChange={(event) => updateField(titleKey, event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  본문
                  <textarea
                    value={messageValue}
                    onChange={(event) => updateField(messageKey, event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </label>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
