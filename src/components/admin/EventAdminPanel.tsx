"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import RichTextEditor from "@/components/RichTextEditor";
import { formatSiteSettingsSaveError } from "@/lib/site-settings-save-error";
import {
  fromDatetimeLocalValue,
  normalizeSiteEventListType,
  toDatetimeLocalValue,
} from "@/lib/site-events";
import { getStorageErrorMessage, uploadPartnershipImage } from "@/lib/storage";
import {
  SiteEvent,
  SiteEventListType,
  SiteEventTab,
  SiteSettings,
  supabase,
} from "@/lib/supabase";

type EventFormState = {
  title: string;
  description: string;
  thumbnail_url: string | null;
  starts_at: string;
  ends_at: string;
  list_type: SiteEventListType;
  is_active: boolean;
  sort_order: number;
};

type TabFormState = {
  label: string;
  body_text: string;
  link_url: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

const EMPTY_EVENT: EventFormState = {
  title: "",
  description: "",
  thumbnail_url: null,
  starts_at: "",
  ends_at: "",
  list_type: "event",
  is_active: true,
  sort_order: 0,
};

const EMPTY_TAB: TabFormState = {
  label: "",
  body_text: "",
  link_url: "",
  image_url: null,
  is_active: true,
  sort_order: 0,
};

function isRichTextEmpty(html: string) {
  return !html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function stripRichText(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

type EventAdminPanelProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  saveSettings: (next: SiteSettings) => Promise<{ error: { message: string } | null }>;
  onMessage: (message: string) => void;
};

export default function EventAdminPanel({
  settings,
  setSettings,
  saveSettings,
  onMessage,
}: EventAdminPanelProps) {
  const [events, setEvents] = useState<SiteEvent[]>([]);
  const [tabs, setTabs] = useState<SiteEventTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>(EMPTY_EVENT);
  const [tabForm, setTabForm] = useState<TabFormState>(EMPTY_TAB);

  const loadEvents = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("site_events")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      onMessage(
        error.message.includes("site_events")
          ? "이벤트 테이블이 없습니다. Supabase SQL Editor에서 site-events.sql을 실행해 주세요."
          : `이벤트 목록 불러오기 실패: ${error.message}`,
      );
      setEvents([]);
    } else {
      setEvents((data as SiteEvent[]) ?? []);
    }

    setLoading(false);
  }, [onMessage]);

  const loadTabs = useCallback(
    async (eventId: string) => {
      const { data, error } = await supabase
        .from("site_event_tabs")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        onMessage(`탭 목록 불러오기 실패: ${error.message}`);
        setTabs([]);
        return;
      }

      setTabs((data as SiteEventTab[]) ?? []);
    },
    [onMessage],
  );

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!selectedEventId) {
      setTabs([]);
      return;
    }
    void loadTabs(selectedEventId);
  }, [loadTabs, selectedEventId]);

  function resetEventForm() {
    setEditingEventId(null);
    setEventForm(EMPTY_EVENT);
  }

  function resetTabForm() {
    setEditingTabId(null);
    setTabForm(EMPTY_TAB);
  }

  function startEditEvent(event: SiteEvent) {
    setEditingEventId(event.id);
    setSelectedEventId(event.id);
    setEventForm({
      title: event.title ?? "",
      description: event.description ?? "",
      thumbnail_url: event.thumbnail_url ?? null,
      starts_at: toDatetimeLocalValue(event.starts_at),
      ends_at: toDatetimeLocalValue(event.ends_at),
      list_type: normalizeSiteEventListType(event.list_type),
      is_active: event.is_active,
      sort_order: event.sort_order ?? 0,
    });
    resetTabForm();
    onMessage("");
  }

  async function handleThumbnailUpload(file: File) {
    setThumbnailUploading(true);
    onMessage("");

    try {
      const url = await uploadPartnershipImage(file, "events");
      setEventForm((prev) => ({ ...prev, thumbnail_url: url }));
      onMessage("이벤트 썸네일이 업로드되었습니다.");
    } catch (error) {
      onMessage(`썸네일 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setThumbnailUploading(false);
    }
  }

  function startEditTab(tab: SiteEventTab) {
    setEditingTabId(tab.id);
    setTabForm({
      label: tab.label ?? "",
      body_text: tab.body_text ?? "",
      link_url: tab.link_url ?? "",
      image_url: tab.image_url,
      is_active: tab.is_active,
      sort_order: tab.sort_order ?? 0,
    });
    onMessage("");
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    onMessage("");

    try {
      const url = await uploadPartnershipImage(file, "events");
      setTabForm((prev) => ({ ...prev, image_url: url }));
      onMessage("탭 이미지가 업로드되었습니다.");
    } catch (error) {
      onMessage(`이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleEventSubmit(event: FormEvent) {
    event.preventDefault();

    const title = eventForm.title.trim();
    if (!title) {
      onMessage("이벤트 제목을 입력해 주세요.");
      return;
    }

    setSaving(true);
    onMessage("");

    const payload = {
      title,
      description: isRichTextEmpty(eventForm.description) ? null : eventForm.description,
      thumbnail_url: eventForm.thumbnail_url?.trim() || null,
      starts_at: fromDatetimeLocalValue(eventForm.starts_at),
      ends_at: fromDatetimeLocalValue(eventForm.ends_at),
      list_type: normalizeSiteEventListType(eventForm.list_type),
      is_active: eventForm.is_active,
      sort_order: Number.isFinite(eventForm.sort_order) ? eventForm.sort_order : 0,
      updated_at: new Date().toISOString(),
    };

    if (editingEventId) {
      const { error } = await supabase.from("site_events").update(payload).eq("id", editingEventId);
      if (error) {
        onMessage(`이벤트 수정 실패: ${error.message}`);
        setSaving(false);
        return;
      }
      onMessage("이벤트가 수정되었습니다.");
    } else {
      const { data, error } = await supabase.from("site_events").insert(payload).select("id").maybeSingle();
      if (error) {
        onMessage(`이벤트 등록 실패: ${error.message}`);
        setSaving(false);
        return;
      }
      onMessage("이벤트가 등록되었습니다.");
      if (data?.id) {
        setSelectedEventId(data.id as string);
      }
    }

    resetEventForm();
    await loadEvents();
    setSaving(false);
  }

  async function handleTabSubmit(event: FormEvent) {
    event.preventDefault();

    if (!selectedEventId) {
      onMessage("탭을 등록하려면 먼저 이벤트를 선택해 주세요.");
      return;
    }

    const label = tabForm.label.trim();
    if (!label) {
      onMessage("탭 이름을 입력해 주세요.");
      return;
    }

    if (!tabForm.image_url?.trim() && !tabForm.body_text.trim() && !tabForm.link_url.trim()) {
      onMessage("이미지·문구·링크 중 하나 이상 입력해 주세요.");
      return;
    }

    setSaving(true);
    onMessage("");

    const payload = {
      event_id: selectedEventId,
      label,
      body_text: tabForm.body_text.trim() || null,
      image_url: tabForm.image_url?.trim() || null,
      link_url: tabForm.link_url.trim() || null,
      is_active: tabForm.is_active,
      sort_order: Number.isFinite(tabForm.sort_order) ? tabForm.sort_order : 0,
      updated_at: new Date().toISOString(),
    };

    if (editingTabId) {
      const { error } = await supabase.from("site_event_tabs").update(payload).eq("id", editingTabId);
      if (error) {
        onMessage(`탭 수정 실패: ${error.message}`);
        setSaving(false);
        return;
      }
      onMessage("탭이 수정되었습니다.");
    } else {
      const { error } = await supabase.from("site_event_tabs").insert(payload);
      if (error) {
        onMessage(`탭 등록 실패: ${error.message}`);
        setSaving(false);
        return;
      }
      onMessage("탭이 등록되었습니다.");
    }

    resetTabForm();
    await loadTabs(selectedEventId);
    setSaving(false);
  }

  async function handleDeleteEvent(item: SiteEvent) {
    if (!window.confirm(`"${item.title}" 이벤트와 하위 탭을 모두 삭제할까요?`)) {
      return;
    }

    const { error } = await supabase.from("site_events").delete().eq("id", item.id);
    if (error) {
      onMessage(`이벤트 삭제 실패: ${error.message}`);
      return;
    }

    if (editingEventId === item.id) {
      resetEventForm();
    }
    if (selectedEventId === item.id) {
      setSelectedEventId(null);
      resetTabForm();
    }

    onMessage("이벤트가 삭제되었습니다.");
    await loadEvents();
  }

  async function handleDeleteTab(tab: SiteEventTab) {
    if (!window.confirm(`"${tab.label}" 탭을 삭제할까요?`)) {
      return;
    }

    const { error } = await supabase.from("site_event_tabs").delete().eq("id", tab.id);
    if (error) {
      onMessage(`탭 삭제 실패: ${error.message}`);
      return;
    }

    if (editingTabId === tab.id) {
      resetTabForm();
    }

    onMessage("탭이 삭제되었습니다.");
    if (selectedEventId) {
      await loadTabs(selectedEventId);
    }
  }

  async function toggleEventActive(item: SiteEvent) {
    const { error } = await supabase
      .from("site_events")
      .update({ is_active: !item.is_active, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    if (error) {
      onMessage(`상태 변경 실패: ${error.message}`);
      return;
    }

    await loadEvents();
  }

  async function toggleTabActive(tab: SiteEventTab) {
    const { error } = await supabase
      .from("site_event_tabs")
      .update({ is_active: !tab.is_active, updated_at: new Date().toISOString() })
      .eq("id", tab.id);

    if (error) {
      onMessage(`탭 상태 변경 실패: ${error.message}`);
      return;
    }

    if (selectedEventId) {
      await loadTabs(selectedEventId);
    }
  }

  const selectedEvent = events.find((item) => item.id === selectedEventId) ?? null;

  async function handleToolbarIconUpload(file: File) {
    setIconUploading(true);
    onMessage("");

    try {
      const url = await uploadPartnershipImage(file, "events");
      const next = { ...settings, site_events_icon_url: url };
      setSettings(next);
      const { error } = await saveSettings(next);
      onMessage(
        error
          ? formatSiteSettingsSaveError(error.message)
          : "이벤트 아이콘이 저장되었습니다.",
      );
    } catch (error) {
      onMessage(`아이콘 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setIconUploading(false);
    }
  }

  async function handleToolbarIconRemove() {
    setIconUploading(true);
    onMessage("");
    const next = { ...settings, site_events_icon_url: null };
    setSettings(next);
    const { error } = await saveSettings(next);
    onMessage(
      error ? formatSiteSettingsSaveError(error.message) : "이벤트 아이콘을 기본 아이콘으로 되돌렸습니다.",
    );
    setIconUploading(false);
  }

  return (
    <div className="space-y-6">
      <AdminCollapsibleSection
        title="상단 메뉴 · 이벤트"
        description="게시판 라인에 표시되는 이벤트 칩입니다. 게시판 메뉴와 같이 이름·아이콘·힌트·클릭 알림을 설정합니다."
      >
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            메뉴 이름
            <input
              value={settings.site_events_label ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  site_events_label: e.target.value.trim() ? e.target.value : null,
                }))
              }
              placeholder="이벤트"
              maxLength={20}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-700">메뉴 아이콘 (이미지 · 선택)</p>
            <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <span className="flex h-5 w-5 items-center justify-center overflow-hidden">
                {settings.site_events_icon_url?.trim() ? (
                  <img
                    src={settings.site_events_icon_url.trim()}
                    alt=""
                    className="h-5 w-5 object-contain"
                  />
                ) : (
                  <span className="text-emerald-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-5 w-5"
                      aria-hidden
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4" />
                      <path d="M8 2v4" />
                      <path d="M3 10h18" />
                    </svg>
                  </span>
                )}
              </span>
              <span className="truncate text-sm font-medium text-gray-800">
                {settings.site_events_label?.trim() || "이벤트"}
              </span>
              <span className="text-xs text-gray-400">미리보기</span>
            </div>
            <label className="mt-3 block text-sm font-medium text-gray-700">
              아이콘 업로드
              <input
                type="file"
                accept="image/*"
                disabled={iconUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleToolbarIconUpload(file);
                  e.target.value = "";
                }}
                className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
              />
            </label>
            {iconUploading ? <p className="mt-2 text-sm text-gray-500">처리 중...</p> : null}
            {settings.site_events_icon_url?.trim() ? (
              <button
                type="button"
                onClick={() => void handleToolbarIconRemove()}
                disabled={iconUploading}
                className="mt-2 text-sm text-red-600 hover:underline disabled:opacity-60"
              >
                아이콘 삭제
              </button>
            ) : null}
          </div>

          <label className="block text-sm font-medium text-gray-700">
            호버·탭 힌트 문구
            <input
              value={settings.site_events_hint ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  site_events_hint: e.target.value.trim() ? e.target.value : null,
                }))
              }
              maxLength={60}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
            <span className="mt-1 block text-xs font-normal text-gray-500">
              PC 마우스 올리거나 스마트폰 탭 시 메뉴 위에 표시됩니다. 비우면 메뉴 이름을 사용합니다.
            </span>
          </label>

          <label className="block text-sm font-medium text-gray-700">
            클릭 알림 문구
            <input
              value={settings.site_events_notify_message ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  site_events_notify_message: e.target.value.trim() ? e.target.value : null,
                }))
              }
              maxLength={80}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
            <span className="mt-1 block text-xs font-normal text-gray-500">
              탭·클릭 시 화면 하단 토스트로 잠깐 표시됩니다. 비우면 「메뉴이름」을(를) 엽니다 기본
              문구를 사용합니다.
            </span>
          </label>

          <button
            type="button"
            disabled={iconUploading}
            onClick={async () => {
              const { error } = await saveSettings(settings);
              onMessage(
                error
                  ? formatSiteSettingsSaveError(error.message)
                  : "이벤트 메뉴 설정이 저장되었습니다.",
              );
            }}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            메뉴 설정 저장
          </button>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title={editingEventId ? "이벤트 수정" : "이벤트 등록"}
        description="카드 목록용 썸네일·기간·분류를 설정합니다."
      >
        <form onSubmit={handleEventSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            이벤트 제목
            <input
              value={eventForm.title}
              onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder=""
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>

          <div>
            <p className="text-sm font-medium text-gray-700">설명 (선택)</p>
            <p className="mt-0.5 text-xs text-gray-500">
              게시판 글처럼 사진·글을 작성할 수 있습니다. 비우면 목록에 설명이 표시되지 않습니다.
            </p>
            <div className="mt-2">
              <RichTextEditor
                value={eventForm.description}
                onChange={(html) => setEventForm((prev) => ({ ...prev, description: html }))}
                placeholder="이벤트 안내 내용을 입력하세요."
                minHeightClassName="min-h-40"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700">목록 카드 썸네일</p>
            <input
              type="file"
              accept="image/*"
              disabled={thumbnailUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleThumbnailUpload(file);
                e.target.value = "";
              }}
              className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
            />
            {thumbnailUploading ? <p className="mt-1 text-sm text-gray-500">업로드 중...</p> : null}
            {eventForm.thumbnail_url?.trim() ? (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={eventForm.thumbnail_url.trim()}
                  alt="이벤트 썸네일 미리보기"
                  className="h-16 w-24 rounded-lg object-cover ring-1 ring-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setEventForm((prev) => ({ ...prev, thumbnail_url: null }))}
                  className="text-sm text-red-600 hover:underline"
                >
                  썸네일 제거
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              시작일
              <input
                type="datetime-local"
                value={eventForm.starts_at}
                onChange={(e) => setEventForm((prev) => ({ ...prev, starts_at: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              종료일
              <input
                type="datetime-local"
                value={eventForm.ends_at}
                onChange={(e) => setEventForm((prev) => ({ ...prev, ends_at: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            표시 안내
            <p className="mt-1 text-xs font-normal text-gray-500">
              시작·종료일 기준으로 「진행중인 이벤트」「종료된 이벤트」에 자동 분류됩니다.
            </p>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              표시 순서
              <input
                type="number"
                value={eventForm.sort_order}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="mt-7 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={eventForm.is_active}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, is_active: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-emerald-600"
              />
              앱에 표시
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "저장 중..." : editingEventId ? "이벤트 수정 저장" : "이벤트 등록"}
            </button>
            {editingEventId ? (
              <button
                type="button"
                onClick={resetEventForm}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                수정 취소
              </button>
            ) : null}
          </div>
        </form>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="등록된 이벤트"
        description="이벤트를 선택하면 아래에서 탭을 관리할 수 있습니다."
      >
        {loading ? (
          <p className="mt-4 text-sm text-gray-500">불러오는 중...</p>
        ) : events.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">등록된 이벤트가 없습니다.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {events.map((item) => (
              <li
                key={item.id}
                className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between ${
                  selectedEventId === item.id ? "bg-emerald-50/60" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEventId(item.id);
                    resetTabForm();
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="font-medium text-gray-900">{item.title}</p>
                  {item.description?.trim() ? (
                    <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">
                      {stripRichText(item.description)}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-gray-400">
                    순서 {item.sort_order} · {item.is_active ? "표시중" : "숨김"}
                    {selectedEventId === item.id ? " · 탭 관리 중" : ""}
                  </p>
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleEventActive(item)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {item.is_active ? "숨기기" : "표시"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditEvent(item)}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteEvent(item)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCollapsibleSection>

      {selectedEvent ? (
        <>
          <AdminCollapsibleSection
            title={editingTabId ? `탭 수정 · ${selectedEvent.title}` : `탭 등록 · ${selectedEvent.title}`}
            description="이미지·문구·링크 중 하나 이상 넣으면 됩니다. 비운 항목은 앱에서 숨겨집니다."
          >
            <form onSubmit={handleTabSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                탭 이름
                <input
                  value={tabForm.label}
                  onChange={(e) => setTabForm((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder=""
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                문구 (선택)
                <textarea
                  value={tabForm.body_text}
                  onChange={(e) => setTabForm((prev) => ({ ...prev, body_text: e.target.value }))}
                  rows={4}
                  placeholder=""
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                링크 (선택)
                <input
                  type="url"
                  value={tabForm.link_url}
                  onChange={(e) => setTabForm((prev) => ({ ...prev, link_url: e.target.value }))}
                  placeholder=""
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  표시 순서
                  <input
                    type="number"
                    value={tabForm.sort_order}
                    onChange={(e) =>
                      setTabForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="mt-7 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={tabForm.is_active}
                    onChange={(e) =>
                      setTabForm((prev) => ({ ...prev, is_active: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                  />
                  탭 표시
                </label>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <label className="block text-sm font-medium text-gray-700">
                  탭 이미지 (선택)
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleImageUpload(file);
                      e.target.value = "";
                    }}
                    className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
                  />
                </label>
                {uploading ? <p className="mt-2 text-sm text-gray-500">업로드 중...</p> : null}
                {tabForm.image_url ? (
                  <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white p-4">
                    <img
                      src={tabForm.image_url}
                      alt="탭 이미지 미리보기"
                      className="mx-auto max-h-64 w-full max-w-sm rounded-lg object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setTabForm((prev) => ({ ...prev, image_url: null }))}
                      className="mt-3 text-sm text-red-600 hover:underline"
                    >
                      이미지 제거
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? "저장 중..." : editingTabId ? "탭 수정 저장" : "탭 등록"}
                </button>
                {editingTabId ? (
                  <button
                    type="button"
                    onClick={resetTabForm}
                    className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    수정 취소
                  </button>
                ) : null}
              </div>
            </form>
          </AdminCollapsibleSection>

          <AdminCollapsibleSection title="등록된 탭" description="순서가 낮을수록 먼저 표시됩니다.">
            {tabs.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">등록된 탭이 없습니다.</p>
            ) : (
              <ul className="mt-4 divide-y divide-gray-100">
                {tabs.map((tab) => (
                  <li
                    key={tab.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                        {tab.image_url ? (
                          <img
                            src={tab.image_url}
                            alt={tab.label}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{tab.label}</p>
                        {tab.body_text?.trim() ? (
                          <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
                            {tab.body_text.trim()}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-gray-400">
                          순서 {tab.sort_order} · {tab.is_active ? "표시중" : "숨김"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleTabActive(tab)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {tab.is_active ? "숨기기" : "표시"}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditTab(tab)}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTab(tab)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminCollapsibleSection>
        </>
      ) : null}
    </div>
  );
}