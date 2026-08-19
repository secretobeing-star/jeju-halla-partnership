"use client";

import { useCallback, useEffect, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { adminApiFetch } from "@/lib/admin-api";
import { getStorageErrorMessage, uploadNotificationImage } from "@/lib/storage";
import {
  NOTIFICATION_IMAGE_MAX_EDGE_PX,
  NOTIFICATION_PROFILE_MAX_EDGE_PX,
} from "@/lib/upload-image-compress";
import { SiteSettings } from "@/lib/supabase";

type AdminNotificationRow = {
  id: string;
  title: string;
  body: string;
  link_url: string | null;
  icon_url: string | null;
  image_url: string | null;
  is_active: boolean;
  published_at: string;
  expires_at: string | null;
  push_sent_at: string | null;
};

type NotificationDraft = {
  title: string;
  body: string;
  link_url: string;
  icon_url: string;
  image_url: string;
  /** Empty = never auto-delete. Otherwise days from published_at. */
  auto_delete_days: string;
};

type SiteNotificationsAdminPanelProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
};

const EMPTY_DRAFT: NotificationDraft = {
  title: "",
  body: "",
  link_url: "",
  icon_url: "",
  image_url: "",
  auto_delete_days: "",
};

function daysBetweenApprox(publishedAt: string, expiresAt: string | null) {
  if (!expiresAt) {
    return "";
  }

  const start = new Date(publishedAt).getTime();
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return "";
  }

  return String(Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000))));
}

function rowToDraft(row: AdminNotificationRow): NotificationDraft {
  return {
    title: row.title,
    body: row.body,
    link_url: row.link_url ?? "",
    icon_url: row.icon_url ?? "",
    image_url: row.image_url ?? "",
    auto_delete_days: daysBetweenApprox(row.published_at, row.expires_at),
  };
}

function formatNotificationDateTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ImageAttachField({
  label,
  fieldId,
  value,
  onChange,
  uploading,
  onUpload,
  placeholder,
  previewClassName = "mt-2 h-16 w-16 rounded-lg border border-gray-200 bg-white object-cover",
}: {
  label: string;
  fieldId: string;
  value: string;
  onChange: (value: string) => void;
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
  placeholder?: string;
  previewClassName?: string;
}) {
  const trimmedValue = value.trim();

  return (
    <div className="block text-sm font-medium text-gray-700">
      <span>{label}</span>
      <input
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-100">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void onUpload(file);
              }
              event.target.value = "";
            }}
          />
          {uploading ? "업로드 중..." : "이미지 첨부"}
        </label>
        {trimmedValue ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100"
          >
            이미지 삭제
          </button>
        ) : null}
      </div>
      {trimmedValue ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={trimmedValue} alt="" className={previewClassName} />
      ) : null}
    </div>
  );
}

export default function SiteNotificationsAdminPanel({
  settings,
  setSettings,
}: SiteNotificationsAdminPanelProps) {
  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState<AdminNotificationRow[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState<NotificationDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<NotificationDraft>(EMPTY_DRAFT);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    setMessage("");
    try {
      const body = (await adminApiFetch("/api/admin/notifications")) as {
        notifications?: AdminNotificationRow[];
      };
      setNotifications(body.notifications ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "알림 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    if (settings.site_notifications_enabled ?? false) {
      void loadNotifications();
    }
  }, [settings.site_notifications_enabled, loadNotifications]);

  async function uploadImage(
    fieldKey: string,
    kind: "profile" | "large",
    file: File,
    onSuccess: (url: string) => void,
  ) {
    setUploadingField(fieldKey);
    setMessage("");

    try {
      const url = await uploadNotificationImage(file, kind);
      onSuccess(url);
      setMessage("이미지가 업로드되었습니다. 필요 시 자동으로 크기가 조정됩니다.");
    } catch (error) {
      setMessage(`이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setUploadingField(null);
    }
  }

  async function handleCreateNotification() {
    if (!newDraft.title.trim() || !newDraft.body.trim()) {
      setMessage("제목과 내용을 입력해 주세요.");
      return;
    }

    setCreating(true);
    setMessage("");

    try {
      await adminApiFetch("/api/admin/notifications", {
        method: "POST",
        body: JSON.stringify({
          title: newDraft.title.trim(),
          body: newDraft.body.trim(),
          link_url: newDraft.link_url.trim() || null,
          icon_url: newDraft.icon_url.trim() || null,
          image_url: newDraft.image_url.trim() || null,
          auto_delete_days: newDraft.auto_delete_days.trim() || null,
        }),
      });
      setNewDraft(EMPTY_DRAFT);
      setMessage("알림이 등록되었습니다.");
      await loadNotifications();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "알림 등록에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(id: string) {
    if (!editDraft.title.trim() || !editDraft.body.trim()) {
      setMessage("제목과 내용을 입력해 주세요.");
      return;
    }

    setSavingEditId(id);
    setMessage("");

    try {
      await adminApiFetch(`/api/admin/notifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editDraft.title.trim(),
          body: editDraft.body.trim(),
          link_url: editDraft.link_url.trim() || null,
          icon_url: editDraft.icon_url.trim() || null,
          image_url: editDraft.image_url.trim() || null,
          auto_delete_days: editDraft.auto_delete_days.trim() || null,
        }),
      });
      setEditingId(null);
      setMessage("알림이 수정되었습니다.");
      await loadNotifications();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "알림 수정에 실패했습니다.");
    } finally {
      setSavingEditId(null);
    }
  }

  async function handlePushSend(id: string) {
    setMessage("");
    try {
      const body = (await adminApiFetch(`/api/admin/notifications/${id}/push`, {
        method: "POST",
      })) as { result?: { sent?: number; failed?: number; skipped?: boolean; message?: string } };
      const result = body.result;
      if (result?.skipped) {
        setMessage(result.message ?? "푸시를 보내지 못했습니다.");
        return;
      }
      setMessage(`푸시 발송 완료: 성공 ${result?.sent ?? 0}건, 실패 ${result?.failed ?? 0}건`);
      await loadNotifications();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "푸시 발송에 실패했습니다.");
    }
  }

  function renderDraftFields(
    draft: NotificationDraft,
    onChange: (next: NotificationDraft) => void,
    idPrefix: string,
  ) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          제목
          <input
            id={`${idPrefix}-title`}
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            maxLength={80}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          내용
          <textarea
            id={`${idPrefix}-body`}
            value={draft.body}
            onChange={(e) => onChange({ ...draft, body: e.target.value })}
            rows={3}
            maxLength={500}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          링크 URL (선택)
          <input
            id={`${idPrefix}-link`}
            value={draft.link_url}
            onChange={(e) => onChange({ ...draft, link_url: e.target.value })}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
        <ImageAttachField
          label="프로필 사진 (선택)"
          fieldId={`${idPrefix}-icon`}
          value={draft.icon_url}
          onChange={(icon_url) => onChange({ ...draft, icon_url })}
          uploading={uploadingField === `${idPrefix}-icon`}
          onUpload={(file) =>
            uploadImage(`${idPrefix}-icon`, "profile", file, (url) =>
              onChange({ ...draft, icon_url: url }),
            )
          }
          placeholder="URL 입력 또는 이미지 첨부"
          previewClassName="mt-2 h-16 w-16 rounded-full border border-gray-200 bg-white object-cover"
        />
        <ImageAttachField
          label="알림 이미지 (선택)"
          fieldId={`${idPrefix}-image`}
          value={draft.image_url}
          onChange={(image_url) => onChange({ ...draft, image_url })}
          uploading={uploadingField === `${idPrefix}-image`}
          onUpload={(file) =>
            uploadImage(`${idPrefix}-image`, "large", file, (url) =>
              onChange({ ...draft, image_url: url }),
            )
          }
          placeholder="URL 입력 또는 이미지 첨부"
          previewClassName="site-notification-image mt-2 max-w-lg"
        />
        <label className="block text-sm font-medium text-gray-700">
          N일 후 자동 삭제 (선택)
          <input
            id={`${idPrefix}-auto-delete-days`}
            type="number"
            min={1}
            max={3650}
            inputMode="numeric"
            value={draft.auto_delete_days}
            onChange={(e) => onChange({ ...draft, auto_delete_days: e.target.value })}
            placeholder="비우면 삭제하지 않음"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
          />
          <span className="mt-1 block text-xs font-normal text-gray-500">
            등록일 기준 N일이 지나면 Supabase에서도 알림이 삭제됩니다. 비우면 유지됩니다.
          </span>
        </label>
        <p className="text-xs text-gray-500">
          프로필 사진은 긴 변 최대 {NOTIFICATION_PROFILE_MAX_EDGE_PX}px, 알림 이미지는{" "}
          {NOTIFICATION_IMAGE_MAX_EDGE_PX}×{NOTIFICATION_IMAGE_MAX_EDGE_PX}px 기준으로 업로드 시 자동
          조정됩니다.
        </p>
      </div>
    );
  }

  return (
    <AdminCollapsibleSection
      title="알림 · 푸시"
      description="상단 알림 벨, 푸시 알림 등록·발송 설정입니다."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settings.site_notifications_enabled ?? false}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, site_notifications_enabled: e.target.checked }))
            }
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          알림 벨 표시
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settings.site_push_enabled ?? false}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, site_push_enabled: e.target.checked }))
            }
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          푸시 알림 허용
        </label>
      </div>

      {settings.site_notifications_enabled ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-900">알림 등록</p>
          <div className="mt-3">
            {renderDraftFields(newDraft, setNewDraft, "new-notification")}
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleCreateNotification()}
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {creating ? "등록 중..." : "알림 등록"}
            </button>
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-sm font-semibold text-gray-900">등록된 알림</p>
            {loadingNotifications ? (
              <p className="text-sm text-gray-500">불러오는 중...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-gray-500">등록된 알림이 없습니다.</p>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm"
                >
                  {editingId === item.id ? (
                    <>
                      {renderDraftFields(editDraft, setEditDraft, `edit-${item.id}`)}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={savingEditId === item.id}
                          onClick={() => void handleSaveEdit(item.id)}
                          className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {savingEditId === item.id ? "저장 중..." : "저장"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50"
                        >
                          취소
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          {item.icon_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.icon_url}
                              alt=""
                              className="h-11 w-11 shrink-0 rounded-full border border-gray-200 object-cover"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900">{item.title}</p>
                            <p className="mt-1 text-gray-600">{item.body}</p>
                            {formatNotificationDateTime(item.published_at) ? (
                              <p className="mt-1 text-xs text-gray-400">
                                등록 {formatNotificationDateTime(item.published_at)}
                                {item.push_sent_at
                                  ? ` · 푸시 ${formatNotificationDateTime(item.push_sent_at)}`
                                  : ""}
                                {item.expires_at
                                  ? ` · 자동삭제 ${formatNotificationDateTime(item.expires_at)}`
                                  : " · 자동삭제 없음"}
                              </p>
                            ) : null}
                            {item.link_url ? (
                              <p className="mt-1 truncate text-xs text-emerald-700">{item.link_url}</p>
                            ) : null}
                          </div>
                        </div>
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt=""
                            className="site-notification-image mt-2"
                          />
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditDraft(rowToDraft(item));
                          }}
                          className="rounded border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          수정
                        </button>
                        {(settings.site_push_enabled ?? false) ? (
                          <button
                            type="button"
                            onClick={() => void handlePushSend(item.id)}
                            className="rounded border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
                          >
                            {item.push_sent_at ? "푸시 재발송" : "푸시 발송"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            void adminApiFetch(`/api/admin/notifications/${item.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({ is_active: !item.is_active }),
                            }).then(() => loadNotifications())
                          }
                          className="rounded border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          {item.is_active ? "비활성화" : "활성화"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void adminApiFetch(`/api/admin/notifications/${item.id}`, {
                              method: "DELETE",
                            }).then(() => loadNotifications())
                          }
                          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-4 text-sm text-gray-700">{message}</p> : null}

      <p className="mt-4 text-xs text-gray-500">
        푸시 알림은 Vercel 환경 변수 VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT 설정과
        supabase/site-member-features.sql, site-notification-push-customization.sql 실행이
        필요합니다. 만료된 알림은 알림 조회 시와 매일 크론(`/api/cron/cleanup-notifications`)으로
        Supabase에서 삭제됩니다.
      </p>
    </AdminCollapsibleSection>
  );
}
