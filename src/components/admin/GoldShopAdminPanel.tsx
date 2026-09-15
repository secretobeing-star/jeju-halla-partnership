"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { adminApiFetch } from "@/lib/admin-api";
import type { GoldShopItem, RewardItem, Season } from "@/lib/season-pass";
import type { PublicCardFrameItem } from "@/lib/student-card-frames";

type GoldShopAdminPanelProps = {
  onMessage: (message: string) => void;
};

type ShopFilter = "all" | "pass" | "costume" | "coupon";
type AddKind = "pass" | "costume" | "coupon";

type CatalogRow = {
  key: string;
  source: "premium" | "shop";
  shopItemId: string | null;
  rewardItemId: string | null;
  frameId: string | null;
  kind: "premium" | "costume" | "coupon";
  name: string;
  price_gold: number;
  original_price_gold: number;
  badge_label: string;
  stock: number | null;
  per_user_limit: number;
  is_active: boolean;
  sort_order: number;
};

function kindLabel(kind: CatalogRow["kind"]) {
  if (kind === "premium") return "패스";
  if (kind === "coupon") return "쿠폰";
  return "코스튬";
}

function asShopItem(row: Record<string, unknown>): GoldShopItem {
  return {
    id: String(row.id ?? ""),
    season_id: String(row.season_id ?? ""),
    reward_item_id: (row.reward_item_id as string | null) ?? null,
    name: String(row.name ?? "").trim(),
    item_kind: "reward",
    price_gold: Math.max(0, Number(row.price_gold) || 0),
    original_price_gold: Math.max(0, Number(row.original_price_gold) || 0),
    badge_label: String(row.badge_label ?? "").trim(),
    stock: row.stock == null || row.stock === "" ? null : Math.max(0, Number(row.stock) || 0),
    per_user_limit: Math.max(0, Number(row.per_user_limit) || 0),
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order) || 0,
    purchased_count: 0,
  };
}

function frameIdOf(item: RewardItem) {
  const value = item.metadata.frame_id ?? item.metadata.frameId;
  return typeof value === "string" ? value.trim() : "";
}

export default function GoldShopAdminPanel({ onMessage }: GoldShopAdminPanelProps) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [items, setItems] = useState<RewardItem[]>([]);
  const [shopItems, setShopItems] = useState<GoldShopItem[]>([]);
  const [costumes, setCostumes] = useState<PublicCardFrameItem[]>([]);
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ShopFilter>("all");
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [addKind, setAddKind] = useState<AddKind>("costume");
  const [addCostumeId, setAddCostumeId] = useState("");
  const [addCouponId, setAddCouponId] = useState("");
  const [addCouponName, setAddCouponName] = useState("");
  const [addCouponCode, setAddCouponCode] = useState("");
  const [addPrice, setAddPrice] = useState(0);
  const [addOriginal, setAddOriginal] = useState(0);
  const [addBadge, setAddBadge] = useState("");

  const selected = useMemo(
    () => seasons.find((item) => item.id === seasonId) ?? seasons[0] ?? null,
    [seasons, seasonId],
  );
  const couponItems = useMemo(
    () => items.filter((item) => item.item_type === "coupon"),
    [items],
  );
  const listedCostumeIds = useMemo(
    () =>
      new Set(
        rows
          .filter((row) => row.kind === "costume")
          .map((row) => row.frameId || row.rewardItemId || "")
          .filter(Boolean),
      ),
    [rows],
  );
  const listedCouponIds = useMemo(
    () => new Set(rows.filter((row) => row.kind === "coupon").map((row) => row.rewardItemId || "").filter(Boolean)),
    [rows],
  );

  const loadAll = useCallback(async () => {
    try {
      const [payload, framesPayload] = await Promise.all([
        adminApiFetch("/api/admin/season-pass?view=shop", { timeoutMs: 12_000 }) as Promise<{
          seasons?: Season[];
          items?: RewardItem[];
          shopItems?: Record<string, unknown>[];
          error?: string;
        }>,
        fetch("/api/student/frames")
          .then((res) => res.json())
          .catch(() => ({ frames: [] })) as Promise<{ frames?: PublicCardFrameItem[] }>,
      ]);
      if (payload.error) throw new Error(payload.error);
      const nextSeasons = payload.seasons ?? [];
      setSeasons(nextSeasons);
      setItems(payload.items ?? []);
      setShopItems((payload.shopItems ?? []).map(asShopItem));
      setSeasonId((current) => {
        if (current && nextSeasons.some((season) => season.id === current)) return current;
        return nextSeasons[0]?.id ?? null;
      });
      setCostumes((framesPayload.frames ?? []).filter((frame) => frame.id?.trim() && frame.name?.trim()));
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "골드 상점을 불러오지 못했습니다.");
    }
  }, [onMessage]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const season = selected;
    const listed = [...shopItems].sort((a, b) => a.sort_order - b.sort_order);
    const premium: CatalogRow | null = season
      ? {
          key: "premium",
          source: "premium",
          shopItemId: null,
          rewardItemId: null,
          frameId: null,
          kind: "premium",
          name: "프리미엄 패스",
          price_gold: season.premium_gold_price ?? 0,
          original_price_gold: season.premium_original_price_gold ?? 0,
          badge_label: season.premium_badge_label ?? "인기",
          stock: null,
          per_user_limit: 1,
          is_active: (season.premium_gold_price ?? 0) > 0,
          sort_order: -1,
        }
      : null;
    const shopRows: CatalogRow[] = listed.map((item) => {
      const reward = items.find((entry) => entry.id === item.reward_item_id);
      return {
        key: item.id,
        source: "shop",
        shopItemId: item.id,
        rewardItemId: item.reward_item_id,
        frameId: reward ? frameIdOf(reward) || null : null,
        kind: reward?.item_type === "coupon" ? "coupon" : "costume",
        name: item.name || reward?.name || "상점 상품",
        price_gold: item.price_gold,
        original_price_gold: item.original_price_gold ?? 0,
        badge_label: item.badge_label ?? "",
        stock: item.stock,
        per_user_limit: item.per_user_limit,
        is_active: item.is_active,
        sort_order: item.sort_order,
      };
    });
    setRows(premium ? [premium, ...shopRows] : shopRows);
  }, [items, selected, shopItems]);

  const visibleRows = rows.filter((row) => {
    if (filter === "pass") return row.kind === "premium";
    if (filter === "costume") return row.kind === "costume";
    if (filter === "coupon") return row.kind === "coupon";
    return true;
  });

  function updateRow(key: string, patch: Partial<CatalogRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function saveRow(row: CatalogRow) {
    if (!selected) return;
    setSavingKey(row.key);
    try {
      if (row.source === "premium") {
        await adminApiFetch("/api/admin/season-pass", {
          method: "PATCH",
          body: JSON.stringify({
            entity: "season",
            id: selected.id,
            premium_gold_price: row.price_gold,
            premium_original_price_gold: row.original_price_gold,
            premium_badge_label: row.badge_label,
            gold_shop_enabled: true,
          }),
        });
        setSeasons((prev) =>
          prev.map((item) =>
            item.id === selected.id
              ? {
                  ...item,
                  premium_gold_price: row.price_gold,
                  premium_original_price_gold: row.original_price_gold,
                  premium_badge_label: row.badge_label,
                  gold_shop_enabled: true,
                }
              : item,
          ),
        );
        onMessage("시즌패스 판매를 저장했습니다.");
        return;
      }
      if (!row.shopItemId) throw new Error("상품이 없습니다.");
      await adminApiFetch("/api/admin/season-pass", {
        method: "PATCH",
        body: JSON.stringify({
          entity: "shop_item",
          id: row.shopItemId,
          name: row.name,
          reward_item_id: row.rewardItemId,
          price_gold: row.price_gold,
          original_price_gold: row.original_price_gold,
          badge_label: row.badge_label,
          stock: row.stock,
          per_user_limit: row.per_user_limit,
          is_active: row.is_active,
          sort_order: row.sort_order,
        }),
      });
      onMessage("상품을 저장했습니다.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSavingKey(null);
    }
  }

  async function registerItem() {
    if (!selected) {
      onMessage("시즌이 없습니다. 시즌패스 메뉴에서 시즌만 만들어 주세요.");
      return;
    }
    setSavingKey("add");
    try {
      if (addKind === "pass") {
        await adminApiFetch("/api/admin/season-pass", {
          method: "PATCH",
          body: JSON.stringify({
            entity: "season",
            id: selected.id,
            premium_gold_price: addPrice,
            premium_original_price_gold: addOriginal,
            premium_badge_label: addBadge || "인기",
            gold_shop_enabled: true,
          }),
        });
        onMessage("시즌패스를 상점에 등록했습니다.");
        await loadAll();
        return;
      }

      let rewardItemId = "";
      let name = "";
      if (addKind === "costume") {
        const costume = costumes.find((frame) => frame.id === addCostumeId);
        if (!costume) throw new Error("코스튬을 선택해 주세요.");
        const existing = items.find((item) => item.item_type === "costume" && frameIdOf(item) === costume.id);
        if (existing) {
          rewardItemId = existing.id;
          name = costume.name;
        } else {
          const created = (await adminApiFetch("/api/admin/season-pass", {
            method: "POST",
            body: JSON.stringify({
              entity: "item",
              name: costume.name,
              item_type: "costume",
              image_url: costume.imageUrl || null,
              metadata: { frame_id: costume.id, frame_name: costume.name },
            }),
          })) as { item?: RewardItem };
          rewardItemId = created.item?.id ?? "";
          name = costume.name;
        }
      } else {
        if (addCouponId) {
          const coupon = couponItems.find((item) => item.id === addCouponId);
          if (!coupon) throw new Error("쿠폰을 선택해 주세요.");
          rewardItemId = coupon.id;
          name = coupon.name;
        } else {
          const couponName = addCouponName.trim() || "새 쿠폰";
          const created = (await adminApiFetch("/api/admin/season-pass", {
            method: "POST",
            body: JSON.stringify({
              entity: "item",
              name: couponName,
              item_type: "coupon",
              metadata: { coupon_code: addCouponCode.trim() },
            }),
          })) as { item?: RewardItem };
          rewardItemId = created.item?.id ?? "";
          name = couponName;
        }
      }
      if (!rewardItemId) throw new Error("보상 아이템을 만들지 못했습니다.");
      await adminApiFetch("/api/admin/season-pass", {
        method: "POST",
        body: JSON.stringify({
          entity: "shop_item",
          season_id: selected.id,
          reward_item_id: rewardItemId,
          name,
          price_gold: addPrice,
          original_price_gold: addOriginal,
          badge_label: addBadge,
          per_user_limit: 1,
          is_active: true,
        }),
      });
      setAddCostumeId("");
      setAddCouponId("");
      setAddCouponName("");
      setAddCouponCode("");
      setAddPrice(0);
      setAddOriginal(0);
      setAddBadge("");
      onMessage("물품을 등록했습니다.");
      await loadAll();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "등록에 실패했습니다.");
    } finally {
      setSavingKey(null);
    }
  }

  async function removeRow(row: CatalogRow) {
    if (!row.shopItemId) return;
    setSavingKey(row.key);
    try {
      await adminApiFetch(
        `/api/admin/season-pass?entity=shop_item&id=${encodeURIComponent(row.shopItemId)}`,
        { method: "DELETE" },
      );
      onMessage("물품을 삭제했습니다.");
      await loadAll();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminCollapsibleSection title="물품 등록">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-gray-500">
            종류
            <select
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
              value={addKind}
              onChange={(e) => setAddKind(e.target.value as AddKind)}
            >
              <option value="pass">시즌패스</option>
              <option value="costume">코스튬</option>
              <option value="coupon">쿠폰</option>
            </select>
          </label>
          {addKind === "costume" ? (
            <label className="text-xs text-gray-500 sm:col-span-2">
              코스튬 (전체)
              <select
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                value={addCostumeId}
                onChange={(e) => setAddCostumeId(e.target.value)}
              >
                <option value="">코스튬 선택</option>
                {costumes.map((frame) => (
                  <option key={frame.id} value={frame.id} disabled={listedCostumeIds.has(frame.id)}>
                    {frame.name}
                    {listedCostumeIds.has(frame.id) ? " · 등록됨" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {addKind === "coupon" ? (
            <>
              <label className="text-xs text-gray-500">
                기존 쿠폰
                <select
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                  value={addCouponId}
                  onChange={(e) => setAddCouponId(e.target.value)}
                >
                  <option value="">새로 만들기</option>
                  {couponItems.map((item) => (
                    <option key={item.id} value={item.id} disabled={listedCouponIds.has(item.id)}>
                      {item.name}
                      {listedCouponIds.has(item.id) ? " · 등록됨" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {!addCouponId ? (
                <>
                  <label className="text-xs text-gray-500">
                    쿠폰 이름
                    <input
                      className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                      value={addCouponName}
                      onChange={(e) => setAddCouponName(e.target.value)}
                      placeholder="쿠폰 이름"
                    />
                  </label>
                  <label className="text-xs text-gray-500">
                    쿠폰 코드
                    <input
                      className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                      value={addCouponCode}
                      onChange={(e) => setAddCouponCode(e.target.value)}
                      placeholder="코드"
                    />
                  </label>
                </>
              ) : null}
            </>
          ) : null}
          <label className="text-xs text-gray-500">
            판매가
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              value={addPrice}
              onChange={(e) => setAddPrice(Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-xs text-gray-500">
            원가
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              value={addOriginal}
              onChange={(e) => setAddOriginal(Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-xs text-gray-500">
            뱃지
            <input
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              value={addBadge}
              onChange={(e) => setAddBadge(e.target.value)}
              placeholder="인기 / NEW"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={savingKey === "add"}
          className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white"
          onClick={() => void registerItem()}
        >
          물품 등록
        </button>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="판매 상품">
        <div className="mb-3 flex flex-wrap gap-2">
          {(
            [
              ["all", "전체"],
              ["pass", "패스"],
              ["costume", "코스튬"],
              ["coupon", "쿠폰"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm ${
                filter === id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
              }`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {visibleRows.map((row) => (
            <div key={row.key} className="grid gap-2 rounded-xl border p-3 lg:grid-cols-8">
              <div className="text-xs text-gray-500">
                {kindLabel(row.kind)}
                {row.source === "premium" ? " · 시즌패스" : ""}
                <input
                  className="mt-1 w-full rounded border px-2 py-1 text-sm text-gray-900"
                  value={row.name}
                  disabled={row.source === "premium"}
                  onChange={(e) => updateRow(row.key, { name: e.target.value })}
                />
              </div>
              <label className="text-xs text-gray-500">
                판매가
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={row.price_gold}
                  onChange={(e) => updateRow(row.key, { price_gold: Number(e.target.value) || 0 })}
                />
              </label>
              <label className="text-xs text-gray-500">
                원가
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={row.original_price_gold}
                  onChange={(e) => updateRow(row.key, { original_price_gold: Number(e.target.value) || 0 })}
                />
              </label>
              <label className="text-xs text-gray-500">
                뱃지
                <input
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={row.badge_label}
                  onChange={(e) => updateRow(row.key, { badge_label: e.target.value })}
                />
              </label>
              <label className="text-xs text-gray-500">
                재고
                <input
                  type="number"
                  min={0}
                  disabled={row.source === "premium"}
                  className="mt-1 w-full rounded border px-2 py-1 text-sm disabled:bg-gray-50"
                  value={row.stock ?? ""}
                  placeholder="무제한"
                  onChange={(e) =>
                    updateRow(row.key, {
                      stock: e.target.value === "" ? null : Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
              <label className="text-xs text-gray-500">
                1인 한도
                <input
                  type="number"
                  min={0}
                  disabled={row.source === "premium"}
                  className="mt-1 w-full rounded border px-2 py-1 text-sm disabled:bg-gray-50"
                  value={row.per_user_limit}
                  onChange={(e) => updateRow(row.key, { per_user_limit: Number(e.target.value) || 0 })}
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={row.source === "premium" ? row.price_gold > 0 : row.is_active}
                  disabled={row.source === "premium"}
                  onChange={(e) => updateRow(row.key, { is_active: e.target.checked })}
                />
                {row.source === "premium" ? "판매가 0이면 숨김" : "판매 중"}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={savingKey === row.key}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800"
                  onClick={() => void saveRow(row)}
                >
                  저장
                </button>
                {row.shopItemId ? (
                  <button
                    type="button"
                    disabled={savingKey === row.key}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700"
                    onClick={() => void removeRow(row)}
                  >
                    삭제
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {visibleRows.length === 0 ? <p className="text-sm text-gray-500">등록된 상품이 없습니다.</p> : null}
        </div>
      </AdminCollapsibleSection>
    </div>
  );
}
