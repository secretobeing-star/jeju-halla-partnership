"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { adminApiFetch, getAdminAccessToken } from "@/lib/admin-api";
import {
  gachaProbabilityTotal,
  type GachaRewardKind,
  type GoldShopGachaBox,
  type GoldShopGachaReward,
} from "@/lib/gold-shop-gacha";
import { IMAGE_UPLOAD_ACCEPT } from "@/lib/upload-file-meta";
import { getStorageErrorMessage } from "@/lib/storage";
import type { PublicCardFrameItem } from "@/lib/student-card-frames";

type GoldShopGachaAdminPanelProps = {
  onMessage: (message: string) => void;
  costumes: PublicCardFrameItem[];
};

export default function GoldShopGachaAdminPanel({ onMessage, costumes }: GoldShopGachaAdminPanelProps) {
  const [boxes, setBoxes] = useState<GoldShopGachaBox[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rewardTab, setRewardTab] = useState<GachaRewardKind>("costume");
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const selected = useMemo(
    () => boxes.find((box) => box.id === selectedId) ?? boxes[0] ?? null,
    [boxes, selectedId],
  );

  const load = useCallback(async () => {
    try {
      const payload = (await adminApiFetch("/api/admin/gold-shop-gacha")) as {
        boxes?: GoldShopGachaBox[];
        error?: string;
      };
      if (payload.error && !(payload.boxes && payload.boxes.length === 0)) {
        throw new Error(payload.error);
      }
      const next = payload.boxes ?? [];
      setBoxes(next);
      setSelectedId((current) => {
        if (current && next.some((box) => box.id === current)) return current;
        return next[0]?.id ?? null;
      });
      if (payload.error) onMessage(payload.error);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "확률성 아이템을 불러오지 못했습니다.");
    }
  }, [onMessage]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadImage(file: File, key: string) {
    setUploading(key);
    try {
      const token = await getAdminAccessToken();
      if (!token) throw new Error("관리자 로그인이 필요합니다.");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "gold-shop-gacha");
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
      setUploading(null);
    }
  }

  async function createBox() {
    setSaving("create-box");
    try {
      await adminApiFetch("/api/admin/gold-shop-gacha", {
        method: "POST",
        body: JSON.stringify({ entity: "box", name: "새 확률 상자", price_gold: 0, fx_enabled: true }),
      });
      onMessage("확률 상자를 추가했습니다.");
      await load();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "추가에 실패했습니다.");
    } finally {
      setSaving(null);
    }
  }

  async function saveBox(box: GoldShopGachaBox) {
    setSaving(box.id);
    try {
      await adminApiFetch("/api/admin/gold-shop-gacha", {
        method: "PATCH",
        body: JSON.stringify({
          entity: "box",
          id: box.id,
          name: box.name,
          price_gold: box.price_gold,
          original_price_gold: box.original_price_gold,
          badge_label: box.badge_label,
          fx_enabled: box.fx_enabled,
          idle_image_url: box.idle_image_url,
          burst_image_url: box.burst_image_url,
          open_place: box.open_place,
          layout_count: box.layout_count,
          confirm_popup: box.confirm_popup,
          is_active: box.is_active,
          sort_order: box.sort_order,
        }),
      });
      onMessage("확률 상자를 저장했습니다.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(null);
    }
  }

  async function removeBox(id: string) {
    setSaving(id);
    try {
      await adminApiFetch(`/api/admin/gold-shop-gacha?entity=box&id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      onMessage("확률 상자를 삭제했습니다.");
      await load();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setSaving(null);
    }
  }

  function patchBox(patch: Partial<GoldShopGachaBox>) {
    if (!selected) return;
    setBoxes((prev) => prev.map((box) => (box.id === selected.id ? { ...box, ...patch } : box)));
  }

  async function addReward() {
    if (!selected) return;
    setSaving("add-reward");
    try {
      await adminApiFetch("/api/admin/gold-shop-gacha", {
        method: "POST",
        body: JSON.stringify({
          entity: "reward",
          box_id: selected.id,
          kind: rewardTab,
          name: rewardTab === "gold" ? "골드" : rewardTab === "coupon" ? "쿠폰" : "코스튬",
          probability: 0,
        }),
      });
      await load();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "보상을 추가하지 못했습니다.");
    } finally {
      setSaving(null);
    }
  }

  async function saveReward(reward: GoldShopGachaReward) {
    setSaving(reward.id);
    try {
      await adminApiFetch("/api/admin/gold-shop-gacha", {
        method: "PATCH",
        body: JSON.stringify({ entity: "reward", ...reward }),
      });
      onMessage("확률을 저장했습니다.");
      await load();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(null);
    }
  }

  async function removeReward(id: string) {
    setSaving(id);
    try {
      await adminApiFetch(`/api/admin/gold-shop-gacha?entity=reward&id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await load();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setSaving(null);
    }
  }

  function patchReward(id: string, patch: Partial<GoldShopGachaReward>) {
    setBoxes((prev) =>
      prev.map((box) =>
        box.id === selected?.id
          ? { ...box, rewards: box.rewards.map((item) => (item.id === id ? { ...item, ...patch } : item)) }
          : box,
      ),
    );
  }

  const tabRewards = selected?.rewards.filter((item) => item.kind === rewardTab) ?? [];
  const tabTotal = selected ? gachaProbabilityTotal(selected.rewards, rewardTab) : 0;
  const allTotal = selected ? gachaProbabilityTotal(selected.rewards) : 0;

  return (
    <div className="space-y-6">
      <AdminCollapsibleSection title="확률 상자">
        <div className="mb-3 flex flex-wrap gap-2">
          {boxes.map((box) => (
            <button
              key={box.id}
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm ${
                selected?.id === box.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
              }`}
              onClick={() => setSelectedId(box.id)}
            >
              {box.name || "이름 없음"}
            </button>
          ))}
          <button
            type="button"
            className="rounded-full bg-amber-600 px-3 py-1.5 text-sm text-white"
            disabled={saving === "create-box"}
            onClick={() => void createBox()}
          >
            + 상자 추가
          </button>
        </div>
        {selected ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-gray-500">
              이름
              <input
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                value={selected.name}
                onChange={(event) => patchBox({ name: event.target.value })}
              />
            </label>
            <label className="text-xs text-gray-500">
              판매가
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                value={selected.price_gold}
                onChange={(event) => patchBox({ price_gold: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="text-xs text-gray-500">
              원가
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                value={selected.original_price_gold}
                onChange={(event) => patchBox({ original_price_gold: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="text-xs text-gray-500">
              뱃지
              <input
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                value={selected.badge_label}
                onChange={(event) => patchBox({ badge_label: event.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-800 sm:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={selected.fx_enabled}
                onChange={(event) => patchBox({ fx_enabled: event.target.checked })}
              />
              뽑기 연출 (터치하면 터지는 이미지)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={selected.is_active}
                onChange={(event) => patchBox({ is_active: event.target.checked })}
              />
              판매 중
            </label>
            <label className="text-xs text-gray-800 sm:col-span-2">
              뽑는 위치
              <select
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                value={selected.open_place}
                onChange={(event) =>
                  patchBox({ open_place: event.target.value === "inventory" ? "inventory" : "shop" })
                }
              >
                <option value="shop">상점에서 바로 뽑기</option>
                <option value="inventory">보관함(선물함)에서 열기</option>
              </select>
            </label>
            <label className="text-xs text-gray-500">
              상점 진열 개수 (1~20)
              <input
                type="number"
                min={1}
                max={20}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                value={selected.layout_count}
                onChange={(event) =>
                  patchBox({
                    layout_count: Math.max(1, Math.min(20, Math.floor(Number(event.target.value) || 1))),
                  })
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-800 sm:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={selected.confirm_popup}
                onChange={(event) => patchBox({ confirm_popup: event.target.checked })}
              />
              구매 전 확인 팝업
            </label>
            <label className="text-xs text-gray-500 sm:col-span-2">
              터치할 상자 이미지 (정지 이미지)
              <input
                type="file"
                accept={IMAGE_UPLOAD_ACCEPT}
                className="mt-1 block w-full text-sm"
                disabled={uploading === "idle"}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  const url = await uploadImage(file, "idle");
                  if (url) patchBox({ idle_image_url: url });
                }}
              />
              {selected.idle_image_url ? (
                <img src={selected.idle_image_url} alt="" className="mt-2 h-20 object-contain" />
              ) : null}
            </label>
            <label className="text-xs text-gray-500 sm:col-span-2">
              터지는 연출 (GIF / WebP)
              <input
                type="file"
                accept="image/gif,image/webp,image/png,image/jpeg,.gif,.webp"
                className="mt-1 block w-full text-sm"
                disabled={uploading === "burst"}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  const url = await uploadImage(file, "burst");
                  if (url) patchBox({ burst_image_url: url });
                }}
              />
              {selected.burst_image_url ? (
                <img src={selected.burst_image_url} alt="" className="mt-2 h-20 object-contain" />
              ) : null}
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
              <button
                type="button"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white"
                disabled={saving === selected.id}
                onClick={() => void saveBox(selected)}
              >
                상자 저장
              </button>
              <button
                type="button"
                className="rounded-lg border px-4 py-2 text-sm text-red-600"
                disabled={saving === selected.id}
                onClick={() => void removeBox(selected.id)}
              >
                삭제
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">상자를 추가한 뒤 연출 이미지와 확률을 넣어 주세요.</p>
        )}
      </AdminCollapsibleSection>

      {selected ? (
        <AdminCollapsibleSection title="보상 확률">
          <p className="mb-3 text-xs text-gray-500">
            코스튬·골드·쿠폰 탭별로 확률을 넣습니다. 한 번 뽑을 때 세 탭의 활성 확률이 합쳐져 추첨됩니다. 현재 합계{" "}
            {allTotal.toFixed(2)}
            {allTotal === 0 ? " (0이면 뽑을 수 없음)" : allTotal === 100 ? " (100%)" : " (합이 100이 아니어도 비율로 추첨)"}
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {(
              [
                ["costume", "코스튬"],
                ["gold", "골드"],
                ["coupon", "쿠폰"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`rounded-full px-3 py-1.5 text-sm ${
                  rewardTab === id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                }`}
                onClick={() => setRewardTab(id)}
              >
                {label} ({gachaProbabilityTotal(selected.rewards, id).toFixed(1)})
              </button>
            ))}
          </div>
          <p className="mb-2 text-xs text-gray-500">
            {rewardTab === "costume" ? "코스튬" : rewardTab === "gold" ? "골드" : "쿠폰"} 탭 합계 {tabTotal.toFixed(2)}
          </p>
          <div className="space-y-3">
            {tabRewards.map((reward) => (
              <div key={reward.id} className="grid gap-2 rounded-xl border p-3 lg:grid-cols-6">
                <label className="text-xs text-gray-500">
                  이름
                  <input
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    value={reward.name}
                    onChange={(event) => patchReward(reward.id, { name: event.target.value })}
                  />
                </label>
                <label className="text-xs text-gray-500">
                  확률
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    value={reward.probability}
                    onChange={(event) =>
                      patchReward(reward.id, { probability: Math.max(0, Number(event.target.value) || 0) })
                    }
                  />
                </label>
                {rewardTab === "costume" ? (
                  <label className="text-xs text-gray-500 lg:col-span-2">
                    코스튬
                    <select
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={reward.frame_id ?? ""}
                      onChange={(event) => {
                        const frame = costumes.find((item) => item.id === event.target.value);
                        patchReward(reward.id, {
                          frame_id: event.target.value || null,
                          name: reward.name === "코스튬" && frame?.name ? frame.name : reward.name,
                          image_url: frame?.imageUrl || reward.image_url,
                        });
                      }}
                    >
                      <option value="">선택</option>
                      {costumes.map((frame) => (
                        <option key={frame.id} value={frame.id}>
                          {frame.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {rewardTab === "gold" ? (
                  <label className="text-xs text-gray-500">
                    골드 수량
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={reward.gold_amount}
                      onChange={(event) =>
                        patchReward(reward.id, { gold_amount: Math.max(0, Number(event.target.value) || 0) })
                      }
                    />
                  </label>
                ) : null}
                {rewardTab === "coupon" ? (
                  <label className="text-xs text-gray-500">
                    쿠폰 코드
                    <input
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={reward.coupon_code ?? ""}
                      onChange={(event) => patchReward(reward.id, { coupon_code: event.target.value })}
                    />
                  </label>
                ) : null}
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={reward.is_active}
                    onChange={(event) => patchReward(reward.id, { is_active: event.target.checked })}
                  />
                  활성
                </label>
                <label className="text-xs text-gray-500">
                  이미지
                  <input
                    type="file"
                    accept={IMAGE_UPLOAD_ACCEPT}
                    className="mt-1 block w-full text-xs"
                    disabled={uploading === reward.id}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      const url = await uploadImage(file, reward.id);
                      if (url) patchReward(reward.id, { image_url: url });
                    }}
                  />
                </label>
                <div className="flex items-end gap-2 lg:col-span-6">
                  <button
                    type="button"
                    className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white"
                    disabled={saving === reward.id}
                    onClick={() => void saveReward(reward)}
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    className="rounded border px-3 py-1.5 text-sm text-red-600"
                    disabled={saving === reward.id}
                    onClick={() => void removeReward(reward.id)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm text-white"
            disabled={saving === "add-reward"}
            onClick={() => void addReward()}
          >
            {rewardTab === "costume" ? "코스튬" : rewardTab === "gold" ? "골드" : "쿠폰"} 확률 추가
          </button>
        </AdminCollapsibleSection>
      ) : null}
    </div>
  );
}
