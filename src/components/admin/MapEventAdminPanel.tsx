"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { adminApiFetch } from "@/lib/admin-api";
import {
  DEFAULT_BENEFIT_BTN_LABEL,
  DEFAULT_MAP_TAB_NAME,
  DEFAULT_STAMP_BTN_LABEL,
  probabilityToPercent,
  type MapAppConfig,
  type MapEvent,
  type MapEventReward,
  type MapEventRewardType,
} from "@/lib/map-events";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/site-events";
import { uploadPartnershipImage, getStorageErrorMessage } from "@/lib/storage";
import { supabase, type Partner } from "@/lib/supabase";
import type { PublicCardFrameItem } from "@/data/cardFrames";

type MapEventAdminPanelProps = {
  onMessage: (message: string) => void;
};

type EventForm = {
  tab_name: string;
  title: string;
  description: string;
  is_active: boolean;
  start_at: string;
  end_at: string;
  max_stamps: number;
  percents: number[];
  radius_meters: number;
  cooldown_minutes: number;
  stamp_btn_label: string;
  stamp_active_img: string;
  stamp_inactive_img: string;
  marker_icon_img: string;
  banner_img: string;
  stamp_bar_bg_img: string;
  stamp_bar_bg_color: string;
  completion_badge_img: string;
  guide_text: string;
  distance_error_message: string;
  win_message: string;
  lose_message: string;
  completion_message: string;
  partner_ids: string[];
};

const EMPTY_FORM: EventForm = {
  tab_name: "",
  title: "",
  description: "",
  is_active: true,
  start_at: "",
  end_at: "",
  max_stamps: 1,
  percents: [10],
  radius_meters: 30,
  cooldown_minutes: 0,
  stamp_btn_label: "",
  stamp_active_img: "",
  stamp_inactive_img: "",
  marker_icon_img: "",
  banner_img: "",
  stamp_bar_bg_img: "",
  stamp_bar_bg_color: "#ecfdf5",
  completion_badge_img: "",
  guide_text: "",
  distance_error_message: "제휴처와의 거리가 {distance}m 남았습니다. 지정된 반경({radius}m) 내에서 도장을 찍어주세요.",
  win_message: "선물함으로 보상이 지급되었습니다!",
  lose_message: "",
  completion_message: "완주 보상이 선물함으로 지급되었습니다!",
  partner_ids: [],
};

function eventToForm(event: MapEvent): EventForm {
  const max = Math.max(1, event.max_stamps || 1);
  return {
    tab_name: event.tab_name,
    title: event.title,
    description: event.description,
    is_active: event.is_active,
    start_at: toDatetimeLocalValue(event.start_at),
    end_at: toDatetimeLocalValue(event.end_at),
    max_stamps: max,
    percents: Array.from({ length: max }, (_, i) =>
      probabilityToPercent(event.step_probabilities[i] ?? 0),
    ),
    radius_meters: event.radius_meters || 30,
    cooldown_minutes: event.cooldown_minutes || 0,
    stamp_btn_label: event.stamp_btn_label ?? "",
    stamp_active_img: event.stamp_active_img ?? "",
    stamp_inactive_img: event.stamp_inactive_img ?? "",
    marker_icon_img: event.marker_icon_img ?? "",
    banner_img: event.banner_img ?? "",
    stamp_bar_bg_img: event.stamp_bar_bg_img ?? "",
    stamp_bar_bg_color: event.stamp_bar_bg_color?.trim() || "#ecfdf5",
    completion_badge_img: event.completion_badge_img ?? "",
    guide_text: event.guide_text ?? "",
    distance_error_message:
      event.distance_error_message ??
      "제휴처와의 거리가 {distance}m 남았습니다. 지정된 반경({radius}m) 내에서 도장을 찍어주세요.",
    win_message: event.win_popup_message ?? event.win_message ?? "",
    lose_message: event.lose_popup_message ?? event.lose_message ?? "",
    completion_message: event.completion_popup_message ?? event.completion_message ?? "",
    partner_ids: event.partner_ids ?? [],
  };
}

function asHexColor(value: string, fallback = "#ecfdf5") {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : fallback;
}

function cssBackgroundImage(url: string) {
  const trimmed = url.trim();
  return trimmed ? `url(${JSON.stringify(trimmed)})` : "none";
}

function ImageField({
  label,
  value,
  uploading,
  onUpload,
  onClear,
}: {
  label: string;
  value: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        disabled={uploading}
        className="mt-1 block w-full text-xs"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onUpload(file);
        }}
      />
      {value ? (
        <span className="mt-2 flex items-center gap-3">
          <img src={value} alt="" className="h-12 w-12 rounded-lg object-cover ring-1 ring-gray-200" />
          <button type="button" className="text-xs text-gray-500 hover:text-red-600" onClick={onClear}>
            제거
          </button>
        </span>
      ) : null}
    </label>
  );
}

export default function MapEventAdminPanel({ onMessage }: MapEventAdminPanelProps) {
  const [config, setConfig] = useState<MapAppConfig>({
    default_map_tab_name: DEFAULT_MAP_TAB_NAME,
    default_map_marker_img: "",
    default_benefit_btn_label: DEFAULT_BENEFIT_BTN_LABEL,
    event_stamp_btn_label: DEFAULT_STAMP_BTN_LABEL,
  });
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [chanceForm, setChanceForm] = useState({
    costumeId: "",
    reward_name: "",
    reward_img: "",
    item_value: "",
    stock: 999,
  });
  const [certainForm, setCertainForm] = useState({
    reward_type: "COMPLETION" as Extract<MapEventRewardType, "GUARANTEED" | "COMPLETION">,
    costumeId: "",
    reward_name: "",
    reward_img: "",
    item_value: "",
    stock: 999,
  });
  const [costumes, setCostumes] = useState<PublicCardFrameItem[]>([]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === editingId) ?? null,
    [editingId, events],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [configPayload, eventsPayload, framesPayload] = await Promise.all([
        fetch("/api/map-events/config").then((res) => res.json()) as Promise<{
          config?: MapAppConfig;
          error?: string;
        }>,
        adminApiFetch("/api/map-events?all=1") as Promise<{ events?: MapEvent[]; error?: string }>,
        fetch("/api/student/frames")
          .then((res) => res.json())
          .catch(() => ({ frames: [] })) as Promise<{
          frames?: PublicCardFrameItem[];
        }>,
      ]);
      if (configPayload.error) throw new Error(configPayload.error);
      if (configPayload.config) setConfig(configPayload.config);
      setEvents(eventsPayload.events ?? []);
      setCostumes(
        (framesPayload.frames ?? []).filter((frame) => frame.id?.trim() && frame.name?.trim()),
      );

      const { data: partnerRows } = await supabase
        .from("partners")
        .select("id, name, category, is_active")
        .order("name", { ascending: true });
      setPartners((partnerRows ?? []) as Partner[]);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "지도 이벤트를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function uploadImage(file: File, key: string) {
    setUploadingKey(key);
    try {
      return await uploadPartnershipImage(file, "map-events");
    } catch (error) {
      onMessage(getStorageErrorMessage(error));
      return null;
    } finally {
      setUploadingKey(null);
    }
  }

  async function saveConfig(next: MapAppConfig) {
    setSaving(true);
    try {
      await adminApiFetch("/api/map-events/config", {
        method: "PUT",
        body: JSON.stringify(next),
      });
      setConfig(next);
      onMessage("기본 지도 설정을 저장했습니다.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function setMaxStamps(next: number) {
    const max = Math.max(1, Math.floor(next) || 1);
    setForm((prev) => ({
      ...prev,
      max_stamps: max,
      percents: Array.from({ length: max }, (_, i) => prev.percents[i] ?? 10),
    }));
  }

  async function handleEventSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        tab_name: form.tab_name,
        title: form.title,
        description: form.description,
        is_active: form.is_active,
        start_at: form.start_at ? fromDatetimeLocalValue(form.start_at) : null,
        end_at: form.end_at ? fromDatetimeLocalValue(form.end_at) : null,
        max_stamps: form.max_stamps,
        step_probabilities: form.percents.map((value) => value / 100),
        radius_meters: form.radius_meters,
        cooldown_minutes: form.cooldown_minutes,
        stamp_btn_label: form.stamp_btn_label?.trim() || null,
        stamp_active_img: form.stamp_active_img || null,
        stamp_inactive_img: form.stamp_inactive_img || null,
        marker_icon_img: form.marker_icon_img || null,
        banner_img: form.banner_img || null,
        stamp_bar_bg_img: form.stamp_bar_bg_img || null,
        stamp_bar_bg_color: form.stamp_bar_bg_color || null,
        completion_badge_img: form.completion_badge_img || null,
        guide_text: form.guide_text || null,
        distance_error_message: form.distance_error_message?.trim() || null,
        win_popup_message: form.win_message?.trim() || null,
        lose_popup_message: form.lose_message?.trim() || null,
        completion_popup_message: form.completion_message?.trim() || null,
        win_message: form.win_message?.trim() || null,
        lose_message: form.lose_message?.trim() || null,
        completion_message: form.completion_message?.trim() || null,
        partner_ids: form.partner_ids,
      };
      if (editingId) {
        await adminApiFetch(`/api/map-events/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        onMessage("이벤트를 수정했습니다.");
      } else {
        await adminApiFetch("/api/map-events", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        onMessage("이벤트를 만들었습니다.");
        setForm(EMPTY_FORM);
      }
      await loadAll();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "이벤트 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: MapEvent) {
    try {
      await adminApiFetch(`/api/map-events/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      await loadAll();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "활성화 변경에 실패했습니다.");
    }
  }

  async function deleteEvent(id: string) {
    if (!window.confirm("이 이벤트를 삭제할까요?")) return;
    try {
      await adminApiFetch(`/api/map-events/${id}`, { method: "DELETE" });
      if (editingId === id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      await loadAll();
      onMessage("이벤트를 삭제했습니다.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
  }

  async function addReward(
    eventSubmit: FormEvent,
    payload: {
      reward_type: MapEventRewardType;
      reward_name: string;
      reward_img: string;
      item_value: string;
      stock: number;
      costumeId?: string;
    },
    reset: () => void,
  ) {
    eventSubmit.preventDefault();
    if (!editingId) {
      onMessage("보상을 등록하려면 먼저 이벤트를 저장·선택한 뒤 진행해 주세요.");
      return;
    }
    if (!payload.item_value.trim()) {
      onMessage("지급할 학생증 코스튬을 선택해 주세요.");
      return;
    }
    try {
      await adminApiFetch(`/api/map-events/${editingId}/rewards`, {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          category: "CARD_SKIN",
          frame_css_value: payload.item_value,
        }),
      });
      reset();
      await loadAll();
      onMessage("보상을 등록했습니다.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "보상 등록에 실패했습니다.");
    }
  }

  async function deleteReward(id: string) {
    try {
      await adminApiFetch(`/api/map-events/rewards/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "보상 삭제에 실패했습니다.");
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">지도 이벤트 설정을 불러오는 중...</p>;
  }

  return (
    <div className="space-y-6">
      <AdminCollapsibleSection
        title="기본 지도 설정"
        description="제휴처 기본 탭 이름과 기본 지도 핀을 실시간으로 바꿀 수 있습니다."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            기본 제휴 탭 이름
            <input
              value={config.default_map_tab_name}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, default_map_tab_name: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="🌿 제휴처"
            />
          </label>
          <ImageField
            label="기본 지도 핀 아이콘"
            value={config.default_map_marker_img}
            uploading={uploadingKey === "default_pin"}
            onUpload={async (file) => {
              const url = await uploadImage(file, "default_pin");
              if (url) setConfig((prev) => ({ ...prev, default_map_marker_img: url }));
            }}
            onClear={() => setConfig((prev) => ({ ...prev, default_map_marker_img: "" }))}
          />
          <label className="block text-sm font-medium text-gray-700">
            자세히 보기 버튼 라벨
            <input
              value={config.default_benefit_btn_label}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, default_benefit_btn_label: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveConfig(config)}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          기본 설정 저장
        </button>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="이벤트 목록"
        description="복수 이벤트를 동시에 활성화할 수 있습니다. 활성 이벤트의 탭 이름이 지도 상단에 나타납니다."
      >
        {events.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 지도 이벤트가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.tab_name || item.title}</p>
                  <p className="text-xs text-gray-500">
                    목표 {item.max_stamps}회 · {item.radius_meters || 30}m ·{" "}
                    {item.is_active ? "활성" : "비활성"}
                    {item.start_at || item.end_at
                      ? ` · ${item.start_at ? new Date(item.start_at).toLocaleString("ko-KR") : "시작 없음"} ~ ${item.end_at ? new Date(item.end_at).toLocaleString("ko-KR") : "종료 없음"}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      item.is_active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                    }`}
                    onClick={() => void toggleActive(item)}
                  >
                    {item.is_active ? "ON" : "OFF"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs"
                    onClick={() => {
                      setEditingId(item.id);
                      setForm(eventToForm(item));
                    }}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600"
                    onClick={() => void deleteEvent(item.id)}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title={editingId ? "이벤트 수정" : "이벤트 생성"}
        headerActions={
          editingId ? (
            <button
              type="button"
              className="text-sm text-gray-500"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
            >
              새로 만들기
            </button>
          ) : undefined
        }
      >
        <form className="grid gap-4" onSubmit={(e) => void handleEventSubmit(e)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              지도 탭 이름
              <input
                required
                value={form.tab_name}
                onChange={(e) => setForm((prev) => ({ ...prev, tab_name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="🎒 미나르숲 소풍"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              이벤트 타이틀
              <input
                required
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
          </div>
          <label className="text-sm font-medium text-gray-700">
            설명
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              완주 목표 도장 수 N
              <input
                type="number"
                min={1}
                value={form.max_stamps}
                onChange={(e) => setMaxStamps(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
              활성화
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              시작 일시
              <input
                type="datetime-local"
                value={form.start_at}
                onChange={(e) => setForm((prev) => ({ ...prev, start_at: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              종료 일시
              <input
                type="datetime-local"
                value={form.end_at}
                onChange={(e) => setForm((prev) => ({ ...prev, end_at: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              위치 인증 반경 (m)
              <input
                type="number"
                min={1}
                value={form.radius_meters}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, radius_meters: Number(e.target.value) || 30 }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              N분 이후 도장 가능 (쿨타임)
              <input
                type="number"
                min={0}
                value={form.cooldown_minutes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, cooldown_minutes: Number(e.target.value) || 0 }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
              <span className="mt-1 block text-xs font-normal text-gray-500">
                0이면 바로 다음 도장을 찍을 수 있고, N이면 직전 도장 후 N분이 지나야 합니다.
              </span>
            </label>
          </div>

          {/* 도장 찍기 버튼 라벨 커스텀 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              도장 찍기 버튼 문구
              <input
                value={form.stamp_btn_label}
                onChange={(e) => setForm((prev) => ({ ...prev, stamp_btn_label: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="도장 찍기 (비우면 기본값 적용)"
              />
              <span className="mt-1 block text-xs font-normal text-gray-500">
                해당 이벤트 탭 활성화 시 지도 하단 및 매장 상세의 스탬프 버튼에 표시됩니다.
              </span>
            </label>
            <label className="text-sm font-medium text-gray-700">
              거리 초과 안내 문구
              <input
                value={form.distance_error_message}
                onChange={(e) => setForm((prev) => ({ ...prev, distance_error_message: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="제휴처와의 거리가 {distance}m 남았습니다. ({radius}m 내)"
              />
              <span className="mt-1 block text-xs font-normal text-gray-500">
                {`{distance}`}와 {`{radius}`}는 실제 거리/반경 숫자로 자동 치환됩니다.
              </span>
            </label>
          </div>

          <label className="text-sm font-medium text-gray-700">
            안내 문구
            <textarea
              rows={2}
              value={form.guide_text}
              onChange={(e) => setForm((prev) => ({ ...prev, guide_text: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium text-gray-700">
              당첨 문구
              <input
                value={form.win_message}
                onChange={(e) => setForm((prev) => ({ ...prev, win_message: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              미당첨 문구
              <input
                value={form.lose_message}
                onChange={(e) => setForm((prev) => ({ ...prev, lose_message: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              완주 문구
              <input
                value={form.completion_message}
                onChange={(e) => setForm((prev) => ({ ...prev, completion_message: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">회차별 당첨 확률 (%)</p>
            <div className="grid gap-2 sm:grid-cols-4">
              {form.percents.map((value, index) => (
                <label key={index} className="text-xs text-gray-600">
                  {index + 1}회
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={value}
                    onChange={(e) => {
                      const next = [...form.percents];
                      next[index] = Number(e.target.value);
                      setForm((prev) => ({ ...prev, percents: next }));
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-sm font-semibold text-gray-800">스탬프 바 미리보기</p>
            <p className="mt-1 text-xs text-gray-500">
              배경·도장·완주 아이콘을 올리면 지도 상단 바에 그대로 반영됩니다.
            </p>
            <div
              className="map-event-stamp-bar mt-3 mb-0"
              style={{
                ["--stamp-bar-bg-color" as string]: asHexColor(form.stamp_bar_bg_color),
                ["--stamp-bar-bg-image" as string]: cssBackgroundImage(form.stamp_bar_bg_img),
              }}
            >
              <div className="map-event-stamp-bar__copy">
                <p className="map-event-stamp-bar__title">{form.title || "이벤트 제목"}</p>
                <p className="map-event-stamp-bar__meta">0 / {form.max_stamps}</p>
              </div>
              <div className="map-event-stamps" aria-hidden="true">
                {Array.from({ length: Math.max(1, form.max_stamps) }, (_, index) =>
                  form.stamp_inactive_img ? (
                    <img key={index} src={form.stamp_inactive_img} alt="" className="map-event-stamp" />
                  ) : (
                    <span key={index} className="map-event-stamp map-event-stamp--fallback" />
                  ),
                )}
                {form.completion_badge_img ? (
                  <span className="map-event-completion-reward" title="완주">
                    <img src={form.completion_badge_img} alt="" />
                    <span className="map-event-completion-reward__label">완주</span>
                  </span>
                ) : (
                  <span className="map-event-completion-reward" title="완주">
                    <span className="map-event-completion-reward__fallback" />
                    <span className="map-event-completion-reward__label">완주</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageField
              label="채워진 도장"
              value={form.stamp_active_img}
              uploading={uploadingKey === "stamp_active"}
              onUpload={async (file) => {
                const url = await uploadImage(file, "stamp_active");
                if (url) setForm((prev) => ({ ...prev, stamp_active_img: url }));
              }}
              onClear={() => setForm((prev) => ({ ...prev, stamp_active_img: "" }))}
            />
            <ImageField
              label="빈 도장"
              value={form.stamp_inactive_img}
              uploading={uploadingKey === "stamp_inactive"}
              onUpload={async (file) => {
                const url = await uploadImage(file, "stamp_inactive");
                if (url) setForm((prev) => ({ ...prev, stamp_inactive_img: url }));
              }}
              onClear={() => setForm((prev) => ({ ...prev, stamp_inactive_img: "" }))}
            />
            <ImageField
              label="스탬프 바 배경 이미지"
              value={form.stamp_bar_bg_img}
              uploading={uploadingKey === "stamp_bar_bg"}
              onUpload={async (file) => {
                const url = await uploadImage(file, "stamp_bar_bg");
                if (url) setForm((prev) => ({ ...prev, stamp_bar_bg_img: url }));
              }}
              onClear={() => setForm((prev) => ({ ...prev, stamp_bar_bg_img: "" }))}
            />
            <label className="block text-sm font-medium text-gray-700">
              스탬프 바 배경색
              <input
                type="color"
                value={asHexColor(form.stamp_bar_bg_color)}
                onChange={(e) => setForm((prev) => ({ ...prev, stamp_bar_bg_color: e.target.value }))}
                className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white"
              />
            </label>
            <ImageField
              label="완주 아이콘 (오른쪽 원형)"
              value={form.completion_badge_img}
              uploading={uploadingKey === "completion_badge"}
              onUpload={async (file) => {
                const url = await uploadImage(file, "completion_badge");
                if (url) setForm((prev) => ({ ...prev, completion_badge_img: url }));
              }}
              onClear={() => setForm((prev) => ({ ...prev, completion_badge_img: "" }))}
            />
            <ImageField
              label="지도 핀 아이콘"
              value={form.marker_icon_img}
              uploading={uploadingKey === "marker"}
              onUpload={async (file) => {
                const url = await uploadImage(file, "marker");
                if (url) setForm((prev) => ({ ...prev, marker_icon_img: url }));
              }}
              onClear={() => setForm((prev) => ({ ...prev, marker_icon_img: "" }))}
            />
            <ImageField
              label="배너 / 당첨 모달 이미지"
              value={form.banner_img}
              uploading={uploadingKey === "banner"}
              onUpload={async (file) => {
                const url = await uploadImage(file, "banner");
                if (url) setForm((prev) => ({ ...prev, banner_img: url }));
              }}
              onClear={() => setForm((prev) => ({ ...prev, banner_img: "" }))}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              도장 장소 (비우면 좌표가 있는 모든 제휴처)
            </p>
            <div className="max-h-48 overflow-auto rounded-xl border border-gray-200 p-3">
              {partners.map((partner) => (
                <label key={partner.id} className="flex items-center gap-2 py-1 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.partner_ids.includes(partner.id)}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        partner_ids: e.target.checked
                          ? [...prev.partner_ids, partner.id]
                          : prev.partner_ids.filter((id) => id !== partner.id),
                      }));
                    }}
                  />
                  {partner.name}
                  {partner.category ? (
                    <span className="text-xs text-gray-400">{partner.category}</span>
                  ) : null}
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {editingId ? "이벤트 수정 저장" : "이벤트 만들기"}
          </button>
        </form>

        {editingId && selectedEvent ? (
          <div className="mt-6 space-y-6 border-t border-gray-200 pt-6">
            <RewardPoolEditor
              title="확률형 보상 관리"
              description="학생증 코스튬만 지급할 수 있습니다. 회차별 당첨 확률에 따라 선물함으로 갑니다."
              rewards={(selectedEvent.rewards ?? []).filter((item) => item.reward_type === "RANDOM_STEP")}
              costumes={costumes}
              extraFields={null}
              form={chanceForm}
              uploading={uploadingKey === "chance_reward"}
              onFormChange={(patch) => setChanceForm((prev) => ({ ...prev, ...patch }))}
              onUpload={async (file) => {
                const url = await uploadImage(file, "chance_reward");
                if (url) setChanceForm((prev) => ({ ...prev, reward_img: url }));
              }}
              onSubmit={(event) =>
                void addReward(
                  event,
                  { ...chanceForm, reward_type: "RANDOM_STEP" },
                  () =>
                    setChanceForm((prev) => ({
                      ...prev,
                      costumeId: "",
                      reward_name: "",
                      reward_img: "",
                      item_value: "",
                    })),
                )
              }
              onDelete={(id) => void deleteReward(id)}
            />
            <RewardPoolEditor
              title="확정형 보상 관리"
              description="매 도장마다 지급하거나, N회 완주 시 반드시 학생증 코스튬을 지급합니다."
              rewards={(selectedEvent.rewards ?? []).filter(
                (item) => item.reward_type === "GUARANTEED" || item.reward_type === "COMPLETION",
              )}
              costumes={costumes}
              extraFields={
                <label className="text-sm font-medium text-gray-700">
                  지급 시점
                  <select
                    value={certainForm.reward_type}
                    onChange={(e) =>
                      setCertainForm((prev) => ({
                        ...prev,
                        reward_type: e.target.value as "GUARANTEED" | "COMPLETION",
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="GUARANTEED">매 도장 확정 (GUARANTEED)</option>
                    <option value="COMPLETION">N회 완주 확정 (COMPLETION)</option>
                  </select>
                </label>
              }
              form={certainForm}
              uploading={uploadingKey === "certain_reward"}
              onFormChange={(patch) => setCertainForm((prev) => ({ ...prev, ...patch }))}
              onUpload={async (file) => {
                const url = await uploadImage(file, "certain_reward");
                if (url) setCertainForm((prev) => ({ ...prev, reward_img: url }));
              }}
              onSubmit={(event) =>
                void addReward(
                  event,
                  certainForm,
                  () =>
                    setCertainForm((prev) => ({
                      ...prev,
                      costumeId: "",
                      reward_name: "",
                      reward_img: "",
                      item_value: "",
                    })),
                )
              }
              onDelete={(id) => void deleteReward(id)}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            이벤트를 만든 뒤 이 화면에서 확률형·확정형 보상을 등록할 수 있습니다.
          </p>
        )}
      </AdminCollapsibleSection>
    </div>
  );
}

type RewardFormFields = {
  costumeId: string;
  reward_name: string;
  reward_img: string;
  item_value: string;
  stock: number;
};

function RewardPoolEditor({
  title,
  description,
  rewards,
  costumes,
  extraFields,
  form,
  uploading,
  onFormChange,
  onUpload,
  onSubmit,
  onDelete,
}: {
  title: string;
  description: string;
  rewards: MapEventReward[];
  costumes: PublicCardFrameItem[];
  extraFields: ReactNode;
  form: RewardFormFields;
  uploading: boolean;
  onFormChange: (patch: Partial<RewardFormFields>) => void;
  onUpload: (file: File) => void;
  onSubmit: (event: FormEvent) => void;
  onDelete: (id: string) => void;
}) {
  const selectedCostume = costumes.find((item) => item.id === form.costumeId) ?? null;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
      <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
        {extraFields}
        <label className="text-sm font-medium text-gray-700 sm:col-span-2">
          지급할 학생증 코스튬
          <select
            required
            value={form.costumeId}
            onChange={(e) => {
              const nextId = e.target.value;
              const costume = costumes.find((item) => item.id === nextId);
              onFormChange({
                costumeId: nextId,
                reward_name: costume?.name ?? "",
                reward_img: costume?.imageUrl ?? "",
                item_value: costume?.id ?? "",
              });
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">코스튬 선택</option>
            {costumes.map((costume) => (
              <option key={costume.id} value={costume.id}>
                {costume.name}
              </option>
            ))}
          </select>
        </label>
        {costumes.length === 0 ? (
          <p className="sm:col-span-2 text-xs text-amber-700">
            등록된 코스튬이 없습니다. 「학생증 코스튬」 메뉴에서 먼저 추가해 주세요.
          </p>
        ) : null}
        {selectedCostume?.imageUrl ? (
          <div className="sm:col-span-2 flex items-center gap-3 text-xs text-gray-500">
            <img
              src={selectedCostume.imageUrl}
              alt=""
              className="h-12 w-20 rounded-md object-cover ring-1 ring-gray-200"
            />
            {selectedCostume.name}
          </div>
        ) : null}
        <label className="text-sm font-medium text-gray-700">
          표시 이름
          <input
            required
            value={form.reward_name}
            onChange={(e) => onFormChange({ reward_name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          재고
          <input
            type="number"
            min={0}
            value={form.stock}
            onChange={(e) => onFormChange({ stock: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <ImageField
          label="보상 이미지 (비우면 코스튬 이미지)"
          value={form.reward_img}
          uploading={uploading}
          onUpload={onUpload}
          onClear={() => onFormChange({ reward_img: selectedCostume?.imageUrl ?? "" })}
        />
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={!form.costumeId}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            보상 추가
          </button>
        </div>
      </form>
      <ul className="mt-3 space-y-2">
        {rewards.length === 0 ? (
          <li className="text-xs text-gray-500">등록된 보상이 없습니다.</li>
        ) : (
          rewards.map((reward) => (
            <li
              key={reward.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                {reward.reward_img ? (
                  <img src={reward.reward_img} alt="" className="h-8 w-8 rounded object-cover" />
                ) : null}
                <span>
                  [{reward.reward_type === "RANDOM_STEP"
                    ? "확률"
                    : reward.reward_type === "GUARANTEED"
                      ? "매 도장"
                      : "완주"}]{" "}
                  {reward.reward_name} · 재고 {reward.stock}
                </span>
              </span>
              <button type="button" className="text-xs text-red-600" onClick={() => onDelete(reward.id)}>
                삭제
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}