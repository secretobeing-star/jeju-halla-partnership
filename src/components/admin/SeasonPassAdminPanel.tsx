"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { adminApiFetch, getAdminAccessToken } from "@/lib/admin-api";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/site-events";
import { getStorageErrorMessage } from "@/lib/storage";
import type { RewardItem, Season, SeasonPassLevel, SeasonQuest } from "@/lib/season-pass";
import { asSeasonPassQuestType, seasonPassQuestTypeLabel } from "@/lib/season-pass";
import type { PublicCardFrameItem } from "@/lib/student-card-frames";

type SeasonPassAdminPanelProps = {
  onMessage: (message: string) => void;
};

type SeasonRow = Season & Record<string, unknown>;

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
      {value ? (
        <div className="mt-1 flex items-center gap-2">
          <img src={value} alt="" className="h-10 w-10 rounded object-contain ring-1 ring-gray-200" />
          <button type="button" className="text-xs text-red-600 underline" onClick={onClear}>
            삭제
          </button>
        </div>
      ) : null}
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        className="mt-1 block w-full text-xs"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onUpload(file);
        }}
      />
    </label>
  );
}

export default function SeasonPassAdminPanel({ onMessage }: SeasonPassAdminPanelProps) {
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [items, setItems] = useState<RewardItem[]>([]);
  const [levels, setLevels] = useState<SeasonPassLevel[]>([]);
  const [quests, setQuests] = useState<SeasonQuest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [premiumUserId, setPremiumUserId] = useState("");
  const [costumes, setCostumes] = useState<PublicCardFrameItem[]>([]);

  const selected = useMemo(
    () => seasons.find((item) => item.id === selectedId) ?? null,
    [seasons, selectedId],
  );
  const seasonLevels = useMemo(
    () => levels.filter((item) => item.season_id === selectedId).sort((a, b) => a.level - b.level),
    [levels, selectedId],
  );
  const seasonQuests = useMemo(
    () => quests.filter((item) => item.season_id === selectedId),
    [quests, selectedId],
  );

  const loadAll = useCallback(async () => {
    try {
      const payload = (await adminApiFetch("/api/admin/season-pass", { timeoutMs: 28_000 })) as {
        seasons?: SeasonRow[];
        items?: RewardItem[];
        levels?: SeasonPassLevel[];
        quests?: SeasonQuest[];
        error?: string;
      };
      if (payload.error) throw new Error(payload.error);
      setSeasons(payload.seasons ?? []);
      setItems((payload.items ?? []) as RewardItem[]);
      setLevels(payload.levels ?? []);
      setQuests(payload.quests ?? []);
      setSelectedId((current) => current ?? payload.seasons?.[0]?.id ?? null);
      const framesPayload = (await fetch("/api/student/frames")
        .then((res) => res.json())
        .catch(() => ({ frames: [] }))) as { frames?: PublicCardFrameItem[] };
      setCostumes((framesPayload.frames ?? []).filter((frame) => frame.id?.trim() && frame.name?.trim()));
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "시즌패스를 불러오지 못했습니다.");
    }
  }, [onMessage]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function uploadImage(file: File, key: string) {
    setUploadingKey(key);
    try {
      const token = await getAdminAccessToken();
      if (!token) throw new Error("관리자 로그인이 필요합니다.");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "season-pass");
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "업로드 실패");
      return payload.url;
    } catch (error) {
      onMessage(getStorageErrorMessage(error));
      return null;
    } finally {
      setUploadingKey(null);
    }
  }

  async function patchSeason(patch: Record<string, unknown>) {
    if (!selected) return;
    setSaving(true);
    try {
      await adminApiFetch("/api/admin/season-pass", {
        method: "PATCH",
        body: JSON.stringify({ entity: "season", id: selected.id, ...patch }),
      });
      onMessage("시즌을 저장했습니다.");
      await loadAll();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSeason(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = (await adminApiFetch("/api/admin/season-pass", {
        method: "POST",
        body: JSON.stringify({ entity: "season", title: "새 시즌", code: `S${Date.now()}`, is_active: false }),
      })) as { season?: SeasonRow };
      if (result.season?.id) setSelectedId(result.season.id);
      onMessage("시즌을 만들었습니다.");
      await loadAll();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "생성 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSeason() {
    if (!selected) return;
    const title = selected.title || selected.code || "이 시즌";
    const confirmed = window.confirm(
      selected.is_active
        ? `"${title}"은(는) 현재 진행 중인 시즌입니다. 진행도·보상 기록까지 모두 삭제됩니다. 삭제할까요?`
        : `"${title}" 시즌을 삭제할까요? 진행도·보상 기록도 함께 삭제됩니다.`,
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await adminApiFetch(`/api/admin/season-pass?entity=season&id=${encodeURIComponent(selected.id)}`, {
        method: "DELETE",
      });
      const remaining = seasons.filter((item) => item.id !== selected.id);
      setSelectedId(remaining[0]?.id ?? null);
      onMessage("시즌을 삭제했습니다.");
      await loadAll();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "삭제 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminCollapsibleSection
        title="시즌 목록"
        description="활성화된 시즌 1개가 제휴 탭 지도 아래 위젯에 표시됩니다. 테이블이 없으면 supabase/season-pass.sql 을 실행하세요."
      >
        <div className="flex flex-wrap gap-2">
          {seasons.map((season) => (
            <button
              key={season.id}
              type="button"
              onClick={() => setSelectedId(season.id)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                selectedId === season.id ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {season.title || season.code}
              {season.is_active ? " · 활성" : ""}
            </button>
          ))}
          <button
            type="button"
            disabled={saving}
            onClick={(event) => void handleCreateSeason(event)}
            className="rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-sm"
          >
            + 시즌 추가
          </button>
        </div>
      </AdminCollapsibleSection>

      {selected ? (
        <AdminCollapsibleSection title="시즌 설정">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              타이틀
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={selected.title}
                onChange={(e) =>
                  setSeasons((prev) =>
                    prev.map((item) => (item.id === selected.id ? { ...item, title: e.target.value } : item)),
                  )
                }
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              시즌 코드
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={selected.code}
                onChange={(e) =>
                  setSeasons((prev) =>
                    prev.map((item) => (item.id === selected.id ? { ...item, code: e.target.value } : item)),
                  )
                }
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              시작
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={toDatetimeLocalValue(selected.starts_at)}
                onChange={(e) =>
                  setSeasons((prev) =>
                    prev.map((item) =>
                      item.id === selected.id
                        ? { ...item, starts_at: fromDatetimeLocalValue(e.target.value) }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              종료
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={toDatetimeLocalValue(selected.ends_at)}
                onChange={(e) =>
                  setSeasons((prev) =>
                    prev.map((item) =>
                      item.id === selected.id
                        ? { ...item, ends_at: fromDatetimeLocalValue(e.target.value) }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              레벨당 EXP
              <input
                type="number"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={selected.exp_per_level}
                onChange={(e) =>
                  setSeasons((prev) =>
                    prev.map((item) =>
                      item.id === selected.id ? { ...item, exp_per_level: Number(e.target.value) || 1 } : item,
                    ),
                  )
                }
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              제휴 도장 EXP
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={selected.visit_exp}
                onChange={(e) =>
                  setSeasons((prev) =>
                    prev.map((item) =>
                      item.id === selected.id ? { ...item, visit_exp: Number(e.target.value) || 0 } : item,
                    ),
                  )
                }
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              제휴 도장 골드
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={selected.visit_gold}
                onChange={(e) =>
                  setSeasons((prev) =>
                    prev.map((item) =>
                      item.id === selected.id ? { ...item, visit_gold: Number(e.target.value) || 0 } : item,
                    ),
                  )
                }
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              프리미엄 패스 가격 (골드)
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={selected.premium_gold_price ?? 0}
                onChange={(e) =>
                  setSeasons((prev) =>
                    prev.map((item) =>
                      item.id === selected.id
                        ? { ...item, premium_gold_price: Number(e.target.value) || 0 }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={selected.gold_shop_enabled !== false}
                onChange={(e) =>
                  setSeasons((prev) =>
                    prev.map((item) =>
                      item.id === selected.id ? { ...item, gold_shop_enabled: e.target.checked } : item,
                    ),
                  )
                }
              />
              골드 상점 사용
            </label>
            <label className="text-sm font-medium text-gray-700">
              출석 EXP / 골드
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  type="number"
                  className="rounded-lg border px-3 py-2"
                  value={selected.attendance_exp ?? 50}
                  onChange={(e) =>
                    setSeasons((prev) =>
                      prev.map((item) =>
                        item.id === selected.id ? { ...item, attendance_exp: Number(e.target.value) || 0 } : item,
                      ),
                    )
                  }
                />
                <input
                  type="number"
                  className="rounded-lg border px-3 py-2"
                  value={selected.attendance_gold ?? 5}
                  onChange={(e) =>
                    setSeasons((prev) =>
                      prev.map((item) =>
                        item.id === selected.id ? { ...item, attendance_gold: Number(e.target.value) || 0 } : item,
                      ),
                    )
                  }
                />
              </div>
            </label>
            <ImageField
              label="배경 이미지"
              value={selected.bg_image_url ?? ""}
              uploading={uploadingKey === "bg"}
              onUpload={async (file) => {
                const url = await uploadImage(file, "bg");
                if (url) {
                  setSeasons((prev) =>
                    prev.map((item) => (item.id === selected.id ? { ...item, bg_image_url: url } : item)),
                  );
                }
              }}
              onClear={() =>
                setSeasons((prev) =>
                  prev.map((item) => (item.id === selected.id ? { ...item, bg_image_url: null } : item)),
                )
              }
            />
            <ImageField
              label="UI / 뱃지 이미지"
              value={selected.ui_image_url ?? ""}
              uploading={uploadingKey === "ui"}
              onUpload={async (file) => {
                const url = await uploadImage(file, "ui");
                if (url) {
                  setSeasons((prev) =>
                    prev.map((item) => (item.id === selected.id ? { ...item, ui_image_url: url } : item)),
                  );
                }
              }}
              onClear={() =>
                setSeasons((prev) =>
                  prev.map((item) => (item.id === selected.id ? { ...item, ui_image_url: null } : item)),
                )
              }
            />
            <ImageField
              label="일반 패스 탭 이미지"
              value={selected.free_pass_image_url ?? ""}
              uploading={uploadingKey === "free-pass"}
              onUpload={async (file) => {
                const url = await uploadImage(file, "free-pass");
                if (url) {
                  setSeasons((prev) =>
                    prev.map((item) => (item.id === selected.id ? { ...item, free_pass_image_url: url } : item)),
                  );
                }
              }}
              onClear={() =>
                setSeasons((prev) =>
                  prev.map((item) => (item.id === selected.id ? { ...item, free_pass_image_url: null } : item)),
                )
              }
            />
            <ImageField
              label="프리미엄 패스 탭 이미지"
              value={selected.premium_pass_image_url ?? ""}
              uploading={uploadingKey === "premium-pass"}
              onUpload={async (file) => {
                const url = await uploadImage(file, "premium-pass");
                if (url) {
                  setSeasons((prev) =>
                    prev.map((item) => (item.id === selected.id ? { ...item, premium_pass_image_url: url } : item)),
                  );
                }
              }}
              onClear={() =>
                setSeasons((prev) =>
                  prev.map((item) => (item.id === selected.id ? { ...item, premium_pass_image_url: null } : item)),
                )
              }
            />
            <ImageField
              label="골드 기본 이미지"
              value={selected.gold_icon_url ?? ""}
              uploading={uploadingKey === "gold-icon"}
              onUpload={async (file) => {
                const url = await uploadImage(file, "gold-icon");
                if (url) {
                  setSeasons((prev) =>
                    prev.map((item) => (item.id === selected.id ? { ...item, gold_icon_url: url } : item)),
                  );
                }
              }}
              onClear={() =>
                setSeasons((prev) =>
                  prev.map((item) => (item.id === selected.id ? { ...item, gold_icon_url: null } : item)),
                )
              }
            />
            <ImageField
              label="수령 완료 체크 이미지"
              value={selected.claimed_check_image_url ?? ""}
              uploading={uploadingKey === "claimed-check"}
              onUpload={async (file) => {
                const url = await uploadImage(file, "claimed-check");
                if (url) {
                  setSeasons((prev) =>
                    prev.map((item) => (item.id === selected.id ? { ...item, claimed_check_image_url: url } : item)),
                  );
                }
              }}
              onClear={() =>
                setSeasons((prev) =>
                  prev.map((item) => (item.id === selected.id ? { ...item, claimed_check_image_url: null } : item)),
                )
              }
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                void patchSeason({
                  title: selected.title,
                  code: selected.code,
                  starts_at: selected.starts_at,
                  ends_at: selected.ends_at,
                  exp_per_level: selected.exp_per_level,
                  visit_exp: selected.visit_exp,
                  visit_gold: selected.visit_gold,
                  premium_gold_price: selected.premium_gold_price,
                  gold_shop_enabled: selected.gold_shop_enabled !== false,
                  attendance_exp: selected.attendance_exp,
                  attendance_gold: selected.attendance_gold,
                  bg_image_url: selected.bg_image_url,
                  ui_image_url: selected.ui_image_url,
                  free_pass_image_url: selected.free_pass_image_url,
                  premium_pass_image_url: selected.premium_pass_image_url,
                  gold_icon_url: selected.gold_icon_url,
                  claimed_check_image_url: selected.claimed_check_image_url,
                  is_active: selected.is_active,
                })
              }
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
            >
              시즌 저장
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void patchSeason({ is_active: !selected.is_active })}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              {selected.is_active ? "비활성화" : "이 시즌 활성화"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleDeleteSeason()}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600"
            >
              시즌 삭제
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="text-sm font-medium text-gray-700">
              학번에 프리미엄 지급
              <input
                className="mt-1 block rounded-lg border px-3 py-2"
                value={premiumUserId}
                onChange={(e) => setPremiumUserId(e.target.value)}
                placeholder="학번"
              />
            </label>
            <button
              type="button"
              className="rounded-lg border px-3 py-2 text-sm"
              onClick={async () => {
                try {
                  await adminApiFetch("/api/admin/season-pass", {
                    method: "POST",
                    body: JSON.stringify({
                      entity: "premium",
                      userId: premiumUserId,
                      season_id: selected.id,
                    }),
                  });
                  onMessage("프리미엄 패스를 지급했습니다.");
                  setPremiumUserId("");
                } catch (error) {
                  onMessage(error instanceof Error ? error.message : "지급 실패");
                }
              }}
            >
              지급
            </button>
          </div>
        </AdminCollapsibleSection>
      ) : null}

      <AdminCollapsibleSection title="보상 아이템" description="코스튬은 목록에서 선택하세요. ID나 이름을 직접 적어도 지급됩니다. 쿠폰은 코드, 골드는 수량입니다.">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="space-y-2 rounded-xl border p-3">
            <div className="grid gap-2 sm:grid-cols-5">
              <input
                className="rounded border px-2 py-1 text-sm"
                value={item.name}
                onChange={(e) =>
                  setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, name: e.target.value } : row)))
                }
              />
              <select
                className="rounded border px-2 py-1 text-sm"
                value={item.item_type}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((row) =>
                      row.id === item.id ? { ...row, item_type: e.target.value as RewardItem["item_type"] } : row,
                    ),
                  )
                }
              >
                <option value="costume">코스튬</option>
                <option value="coupon">쿠폰</option>
                <option value="gold">골드</option>
              </select>
              {item.item_type === "costume" ? (
                <select
                  className="rounded border px-2 py-1 text-sm"
                  value={typeof item.metadata.frame_id === "string" ? item.metadata.frame_id : ""}
                  onChange={(e) => {
                    const costume = costumes.find((frame) => frame.id === e.target.value);
                    setItems((prev) =>
                      prev.map((row) => {
                        if (row.id !== item.id) return row;
                        return {
                          ...row,
                          metadata: { frame_id: e.target.value },
                          image_url: costume?.imageUrl || row.image_url,
                          name: row.name === "새 보상" && costume?.name ? costume.name : row.name,
                        };
                      }),
                    );
                  }}
                >
                  <option value="">코스튬 선택</option>
                  {typeof item.metadata.frame_id === "string" &&
                  item.metadata.frame_id &&
                  !costumes.some((frame) => frame.id === item.metadata.frame_id) ? (
                    <option value={item.metadata.frame_id}>{item.metadata.frame_id}</option>
                  ) : null}
                  {costumes.map((frame) => (
                    <option key={frame.id} value={frame.id}>
                      {frame.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="rounded border px-2 py-1 text-sm"
                  placeholder={item.item_type === "coupon" ? "쿠폰 코드" : "골드 수량"}
                  value={
                    typeof item.metadata.coupon_code === "string"
                      ? item.metadata.coupon_code
                      : String(item.metadata.gold_amount ?? "")
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    setItems((prev) =>
                      prev.map((row) => {
                        if (row.id !== item.id) return row;
                        const metadata =
                          row.item_type === "coupon"
                            ? { coupon_code: value }
                            : { gold_amount: Number(value) || 0 };
                        return { ...row, metadata };
                      }),
                    );
                  }}
                />
              )}
              <button
                type="button"
                className="text-sm text-emerald-700"
                onClick={async () => {
                  await adminApiFetch("/api/admin/season-pass", {
                    method: "PATCH",
                    body: JSON.stringify({
                      entity: "item",
                      id: item.id,
                      name: item.name,
                      item_type: item.item_type,
                      metadata: item.metadata,
                      image_url: item.image_url,
                    }),
                  });
                  onMessage("아이템을 저장했습니다.");
                }}
              >
                저장
              </button>
              <button
                type="button"
                className="text-sm text-red-600"
                onClick={async () => {
                  await adminApiFetch(`/api/admin/season-pass?entity=item&id=${item.id}`, { method: "DELETE" });
                  await loadAll();
                }}
              >
                삭제
              </button>
            </div>
            <ImageField
              label={
                item.item_type === "gold"
                  ? "골드 이미지"
                  : item.item_type === "costume"
                    ? "코스튬 이미지"
                    : "보상 이미지"
              }
              value={item.image_url ?? ""}
              uploading={uploadingKey === `item-${item.id}`}
              onUpload={async (file) => {
                const url = await uploadImage(file, `item-${item.id}`);
                if (url) {
                  setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, image_url: url } : row)));
                }
              }}
              onClear={() =>
                setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, image_url: null } : row)))
              }
            />
            </div>
          ))}
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm"
            onClick={async () => {
              await adminApiFetch("/api/admin/season-pass", {
                method: "POST",
                body: JSON.stringify({ entity: "item", name: "새 보상", item_type: "costume" }),
              });
              await loadAll();
            }}
          >
            + 아이템 추가
          </button>
        </div>
      </AdminCollapsibleSection>

      {selected ? (
        <AdminCollapsibleSection title="레벨별 무료/프리미엄 보상">
          <div className="space-y-2">
            {seasonLevels.map((level) => (
              <div key={level.id} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-5">
                <label className="text-xs text-gray-500">
                  레벨
                  <input
                    type="number"
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    value={level.level}
                    onChange={(e) =>
                      setLevels((prev) =>
                        prev.map((row) =>
                          row.id === level.id ? { ...row, level: Number(e.target.value) || 1 } : row,
                        ),
                      )
                    }
                  />
                </label>
                <label className="text-xs text-gray-500">
                  필요 EXP(누적)
                  <input
                    type="number"
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    value={level.required_exp}
                    onChange={(e) =>
                      setLevels((prev) =>
                        prev.map((row) =>
                          row.id === level.id ? { ...row, required_exp: Number(e.target.value) || 0 } : row,
                        ),
                      )
                    }
                  />
                </label>
                <select
                  className="rounded border px-2 py-1 text-sm"
                  value={level.free_reward_item_id ?? ""}
                  onChange={(e) =>
                    setLevels((prev) =>
                      prev.map((row) =>
                        row.id === level.id ? { ...row, free_reward_item_id: e.target.value || null } : row,
                      ),
                    )
                  }
                >
                  <option value="">무료 보상 없음</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded border px-2 py-1 text-sm"
                  value={level.premium_reward_item_id ?? ""}
                  onChange={(e) =>
                    setLevels((prev) =>
                      prev.map((row) =>
                        row.id === level.id ? { ...row, premium_reward_item_id: e.target.value || null } : row,
                      ),
                    )
                  }
                >
                  <option value="">프리미엄 보상 없음</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="text-sm text-emerald-700"
                  onClick={async () => {
                    await adminApiFetch("/api/admin/season-pass", {
                      method: "PATCH",
                      body: JSON.stringify({
                        entity: "level",
                        id: level.id,
                        level: level.level,
                        required_exp: level.required_exp,
                        free_reward_item_id: level.free_reward_item_id,
                        premium_reward_item_id: level.premium_reward_item_id,
                      }),
                    });
                    onMessage("레벨을 저장했습니다.");
                  }}
                >
                  저장
                </button>
              </div>
            ))}
            <button
              type="button"
              className="rounded-lg border px-3 py-2 text-sm"
              onClick={async () => {
                const nextLevel = (seasonLevels.at(-1)?.level ?? 0) + 1;
                await adminApiFetch("/api/admin/season-pass", {
                  method: "POST",
                  body: JSON.stringify({
                    entity: "level",
                    season_id: selected.id,
                    level: nextLevel,
                    required_exp: (nextLevel - 1) * selected.exp_per_level,
                  }),
                });
                await loadAll();
              }}
            >
              + 레벨 추가
            </button>
          </div>
        </AdminCollapsibleSection>
      ) : null}

      {selected ? (
        <AdminCollapsibleSection title="제휴 퀘스트" description="목표를 채우면 패스 EXP와 골드가 지급됩니다. 제휴 방문은 지도 도장, 출석 체크는 위젯 버튼으로 진행됩니다.">
          {seasonQuests.map((quest) => (
            <div key={quest.id} className="mb-2 grid gap-2 rounded-xl border p-3 sm:grid-cols-7">
              <select
                className="rounded border px-2 py-1 text-sm"
                value={asSeasonPassQuestType(quest.quest_type)}
                onChange={(e) =>
                  setQuests((prev) =>
                    prev.map((row) =>
                      row.id === quest.id ? { ...row, quest_type: asSeasonPassQuestType(e.target.value) } : row,
                    ),
                  )
                }
              >
                <option value="partner_visit">제휴 방문</option>
                <option value="attendance">출석 체크</option>
              </select>
              <input
                className="rounded border px-2 py-1 text-sm"
                value={quest.title}
                onChange={(e) =>
                  setQuests((prev) =>
                    prev.map((row) => (row.id === quest.id ? { ...row, title: e.target.value } : row)),
                  )
                }
              />
              <label className="text-xs text-gray-500">
                목표 횟수
                <input
                  type="number"
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={quest.target_count}
                  onChange={(e) =>
                    setQuests((prev) =>
                      prev.map((row) =>
                        row.id === quest.id ? { ...row, target_count: Number(e.target.value) || 1 } : row,
                      ),
                    )
                  }
                />
              </label>
              <label className="text-xs text-gray-500">
                패스 EXP
                <input
                  type="number"
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={quest.reward_exp}
                  onChange={(e) =>
                    setQuests((prev) =>
                      prev.map((row) =>
                        row.id === quest.id ? { ...row, reward_exp: Number(e.target.value) || 0 } : row,
                      ),
                    )
                  }
                />
              </label>
              <label className="text-xs text-gray-500">
                골드
                <input
                  type="number"
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={quest.reward_gold}
                  onChange={(e) =>
                    setQuests((prev) =>
                      prev.map((row) =>
                        row.id === quest.id ? { ...row, reward_gold: Number(e.target.value) || 0 } : row,
                      ),
                    )
                  }
                />
              </label>
              <textarea
                className="sm:col-span-7 min-h-16 rounded border px-2 py-1 text-sm"
                placeholder="퀘스트 설명 (오른쪽 상세에 표시)"
                value={quest.description ?? ""}
                onChange={(e) =>
                  setQuests((prev) =>
                    prev.map((row) => (row.id === quest.id ? { ...row, description: e.target.value } : row)),
                  )
                }
              />
              <button
                type="button"
                className="text-sm text-emerald-700"
                onClick={async () => {
                  await adminApiFetch("/api/admin/season-pass", {
                    method: "PATCH",
                    body: JSON.stringify({
                      entity: "quest",
                      id: quest.id,
                      title: quest.title,
                      quest_type: quest.quest_type,
                      target_count: quest.target_count,
                      reward_exp: quest.reward_exp,
                      reward_gold: quest.reward_gold,
                      description: quest.description ?? "",
                    }),
                  });
                  onMessage(`${seasonPassQuestTypeLabel(quest.quest_type)} 퀘스트를 저장했습니다.`);
                }}
              >
                저장
              </button>
              <button
                type="button"
                className="text-sm text-red-600"
                onClick={async () => {
                  await adminApiFetch(`/api/admin/season-pass?entity=quest&id=${quest.id}`, { method: "DELETE" });
                  await loadAll();
                }}
              >
                삭제
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border px-3 py-2 text-sm"
              onClick={async () => {
                await adminApiFetch("/api/admin/season-pass", {
                  method: "POST",
                  body: JSON.stringify({
                    entity: "quest",
                    season_id: selected.id,
                    quest_type: "partner_visit",
                    title: "제휴처 N곳 방문",
                    target_count: 3,
                    reward_exp: 200,
                    reward_gold: 0,
                  }),
                });
                await loadAll();
              }}
            >
              + 제휴 방문 퀘스트
            </button>
            <button
              type="button"
              className="rounded-lg border px-3 py-2 text-sm"
              onClick={async () => {
                await adminApiFetch("/api/admin/season-pass", {
                  method: "POST",
                  body: JSON.stringify({
                    entity: "quest",
                    season_id: selected.id,
                    quest_type: "attendance",
                    title: "N일 출석",
                    target_count: 7,
                    reward_exp: 300,
                    reward_gold: 0,
                  }),
                });
                await loadAll();
              }}
            >
              + 출석 체크 퀘스트
            </button>
          </div>
        </AdminCollapsibleSection>
      ) : null}
    </div>
  );
}
