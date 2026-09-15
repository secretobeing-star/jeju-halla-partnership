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

type CatalogRow = {
  key: string;
  source: "premium" | "shop" | "unlisted";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ShopFilter>("all");
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const selected = useMemo(
    () => seasons.find((item) => item.id === selectedId) ?? null,
    [seasons, selectedId],
  );

  const loadAll = useCallback(async () => {
    try {
      const payload = (await adminApiFetch("/api/admin/season-pass", { timeoutMs: 28_000 })) as {
        seasons?: Season[];
        items?: RewardItem[];
        shopItems?: Record<string, unknown>[];
        error?: string;
      };
      if (payload.error) throw new Error(payload.error);
      const nextSeasons = payload.seasons ?? [];
      const nextItems = payload.items ?? [];
      const nextShop = (payload.shopItems ?? []).map(asShopItem);
      setSeasons(nextSeasons);
      setItems(nextItems);
      setShopItems(nextShop);
      setSelectedId((current) => {
        if (current && nextSeasons.some((season) => season.id === current)) return current;
        return nextSeasons.find((season) => season.is_active)?.id ?? nextSeasons[0]?.id ?? null;
      });
      const framesPayload = (await fetch("/api/student/frames")
        .then((res) => res.json())
        .catch(() => ({ frames: [] }))) as { frames?: PublicCardFrameItem[] };
      setCostumes((framesPayload.frames ?? []).filter((frame) => frame.id?.trim() && frame.name?.trim()));
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "골드 상점을 불러오지 못했습니다.");
    }
  }, [onMessage]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedId) {
      setRows([]);
      return;
    }
    const season = seasons.find((item) => item.id === selectedId);
    if (!season) {
      setRows([]);
      return;
    }
    const listed = shopItems
      .filter((item) => item.season_id === season.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const listedRewardIds = new Set(listed.map((item) => item.reward_item_id).filter(Boolean));
    const premium: CatalogRow = {
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
    };
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
    const unlistedRewards: CatalogRow[] = items
      .filter((item) => item.item_type !== "gold" && !listedRewardIds.has(item.id))
      .map((item) => ({
        key: `unlisted-${item.id}`,
        source: "unlisted" as const,
        shopItemId: null,
        rewardItemId: item.id,
        frameId: frameIdOf(item) || null,
        kind: item.item_type === "coupon" ? "coupon" : "costume",
        name: item.name || "보상 아이템",
        price_gold: 0,
        original_price_gold: 0,
        badge_label: "",
        stock: null,
        per_user_limit: 1,
        is_active: true,
        sort_order: 100,
      }));
    const listedFrameIds = new Set(
      [
        ...shopRows.map((row) => row.frameId || ""),
        ...unlistedRewards.map((row) => row.frameId || ""),
      ].filter(Boolean),
    );
    const unlistedFrames: CatalogRow[] = costumes
      .filter((frame) => {
        const id = frame.id.trim();
        return Boolean(id) && !listedFrameIds.has(id);
      })
      .map((frame) => ({
        key: `frame-${frame.id}`,
        source: "unlisted" as const,
        shopItemId: null,
        rewardItemId: null,
        frameId: frame.id,
        kind: "costume" as const,
        name: frame.name,
        price_gold: 0,
        original_price_gold: 0,
        badge_label: "",
        stock: null,
        per_user_limit: 1,
        is_active: true,
        sort_order: 110,
      }));
    setRows([premium, ...shopRows, ...unlistedRewards, ...unlistedFrames]);
  }, [
    costumes,
    items,
    selectedId,
    shopItems,
    selected?.premium_gold_price,
    selected?.premium_original_price_gold,
    selected?.premium_badge_label,
  ]);

  const visibleRows = rows.filter((row) => {
    if (filter === "pass") return row.kind === "premium";
    if (filter === "costume") return row.kind === "costume";
    if (filter === "coupon") return row.kind === "coupon";
    return true;
  });

  function updateRow(key: string, patch: Partial<CatalogRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function saveSeasonShop(patch: Partial<Season>) {
    if (!selected) return;
    setSavingKey("season");
    try {
      await adminApiFetch("/api/admin/season-pass", {
        method: "PATCH",
        body: JSON.stringify({
          entity: "season",
          id: selected.id,
          ...patch,
        }),
      });
      setSeasons((prev) => prev.map((item) => (item.id === selected.id ? { ...item, ...patch } : item)));
      onMessage("골드 상점 설정을 저장했습니다.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSavingKey(null);
    }
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
                }
              : item,
          ),
        );
        onMessage("프리미엄 패스 판매를 저장했습니다.");
        return;
      }
      if (row.source === "unlisted") {
        let rewardItemId = row.rewardItemId;
        if (!rewardItemId && row.frameId) {
          const costume = costumes.find((frame) => frame.id === row.frameId);
          const created = (await adminApiFetch("/api/admin/season-pass", {
            method: "POST",
            body: JSON.stringify({
              entity: "item",
              name: row.name || costume?.name || "코스튬",
              item_type: "costume",
              image_url: costume?.imageUrl || null,
              metadata: {
                frame_id: row.frameId,
                frame_name: costume?.name || row.name,
              },
            }),
          })) as { item?: RewardItem };
          rewardItemId = created.item?.id ?? null;
        }
        if (!rewardItemId) throw new Error("보상 아이템이 없습니다.");
        await adminApiFetch("/api/admin/season-pass", {
          method: "POST",
          body: JSON.stringify({
            entity: "shop_item",
            season_id: selected.id,
            reward_item_id: rewardItemId,
            name: row.name,
            price_gold: row.price_gold,
            original_price_gold: row.original_price_gold,
            badge_label: row.badge_label,
            stock: row.stock,
            per_user_limit: row.per_user_limit,
            is_active: row.is_active,
          }),
        });
        onMessage("상점에 등록했습니다.");
        await loadAll();
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

  async function removeRow(row: CatalogRow) {
    if (!row.shopItemId) return;
    setSavingKey(row.key);
    try {
      await adminApiFetch(
        `/api/admin/season-pass?entity=shop_item&id=${encodeURIComponent(row.shopItemId)}`,
        { method: "DELETE" },
      );
      onMessage("상점에서 내렸습니다.");
      await loadAll();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminCollapsibleSection
        title="골드 상점"
        description="시즌패스를 활성화하지 않아도 전체 코스튬·쿠폰을 등록하고 판매할 수 있습니다. 테이블이 없으면 supabase/season-pass.sql 을 실행하세요."
      >
        <div className="flex flex-wrap gap-2">
          {seasons.map((season) => (
            <button
              key={season.id}
              type="button"
              onClick={() => setSelectedId(season.id)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                selectedId === season.id ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {season.title || season.code}
              {season.is_active ? " · 활성" : ""}
            </button>
          ))}
        </div>
        {seasons.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">먼저 시즌패스 메뉴에서 시즌을 만들어 주세요.</p>
        ) : null}
      </AdminCollapsibleSection>

      {selected ? (
        <AdminCollapsibleSection title="상점 설정">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
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
          <button
            type="button"
            disabled={savingKey === "season"}
            className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm text-white"
            onClick={() => void saveSeasonShop({ gold_shop_enabled: selected.gold_shop_enabled !== false })}
          >
            상점 설정 저장
          </button>
        </AdminCollapsibleSection>
      ) : null}

      {selected ? (
        <AdminCollapsibleSection title="판매 상품" description="미등록 코스튬·쿠폰은 가격을 넣고 등록하면 상점에 올라갑니다.">
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
                  {row.source === "unlisted" ? " · 미등록" : row.source === "premium" ? " · 시즌 패스" : ""}
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
                    onChange={(e) =>
                      updateRow(row.key, { original_price_gold: Number(e.target.value) || 0 })
                    }
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
                    className="text-sm text-emerald-700"
                    onClick={() => void saveRow(row)}
                  >
                    {row.source === "unlisted" ? "상점에 등록" : "저장"}
                  </button>
                  {row.source === "shop" ? (
                    <button
                      type="button"
                      disabled={savingKey === row.key}
                      className="text-sm text-red-600"
                      onClick={() => void removeRow(row)}
                    >
                      내리기
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {visibleRows.length === 0 ? (
              <p className="text-sm text-gray-500">이 분류에 상품이 없습니다.</p>
            ) : null}
          </div>
        </AdminCollapsibleSection>
      ) : null}
    </div>
  );
}
