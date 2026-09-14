"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { adminApiFetch, getAdminAccessToken } from "@/lib/admin-api";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/site-events";
import { getStorageErrorMessage } from "@/lib/storage";
import type { RewardItem, Season, SeasonPassLevel, SeasonQuest } from "@/lib/season-pass";
import { asSeasonPassQuestType, seasonPassQuestTypeLabel } from "@/lib/season-pass";

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
      const payload = (await adminApiFetch("/api/admin/season-pass")) as {
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
                  attendance_exp: selected.attendance_exp,
                  attendance_gold: selected.attendance_gold,
                  bg_image_url: selected.bg_image_url,
                  ui_image_url: selected.ui_image_url,
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

      <AdminCollapsibleSection title="보상 아이템" description="코스튬은 학생증 코스튬 ID, 쿠폰은 코드, 골드는 수량을 입력합니다.">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-5">
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
              <input
                className="rounded border px-2 py-1 text-sm"
                value={
                  typeof item.metadata.frame_id === "string"
                    ? item.metadata.frame_id
                    : typeof item.metadata.coupon_code === "string"
                      ? item.metadata.coupon_code
                      : String(item.metadata.gold_amount ?? "")
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setItems((prev) =>
                    prev.map((row) => {
                      if (row.id !== item.id) return row;
                      const metadata =
                        row.item_type === "costume"
                          ? { frame_id: value }
                          : row.item_type === "coupon"
                            ? { coupon_code: value }
                            : { gold_amount: Number(value) || 0 };
                      return { ...row, metadata };
                    }),
                  );
                }}
              />
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
        <AdminCollapsibleSection title="제휴 퀘스트" description="제휴 방문은 지도 도장, 출석 체크는 위젯 버튼으로 진행됩니다.">
          {seasonQuests.map((quest) => (
            <div key={quest.id} className="mb-2 grid gap-2 rounded-xl border p-3 sm:grid-cols-5">
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
              <input
                type="number"
                className="rounded border px-2 py-1 text-sm"
                value={quest.target_count}
                onChange={(e) =>
                  setQuests((prev) =>
                    prev.map((row) =>
                      row.id === quest.id ? { ...row, target_count: Number(e.target.value) || 1 } : row,
                    ),
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
