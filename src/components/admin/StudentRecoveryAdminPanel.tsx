"use client";

import { FormEvent, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { adminApiFetch } from "@/lib/admin-api";

type RecoveryPayload = {
  studentId: string;
  frames: {
    activeFrameId: string | null;
    unlockedCount: number;
    items: Array<{ id: string; name: string; imageUrl: string | null; source: string | null }>;
  };
  gifts: Array<{
    id: string;
    reward_name?: string | null;
    is_claimed?: boolean;
    created_at?: string;
  }>;
  rewards: Array<{
    id: string;
    title?: string | null;
    reward_type?: string | null;
    status?: string | null;
    created_at?: string;
  }>;
  inventory: Array<{
    id: string;
    reward_name?: string | null;
    category?: string | null;
    source?: string | null;
    created_at?: string;
  }>;
  events: Array<{
    eventId: string;
    title: string;
    tabName: string;
    currentStamps: number;
    isCompleted: boolean;
    updatedAt?: string;
  }>;
  shopPurchases: Array<{
    id: string;
    name: string;
    goldSpent: number;
    createdAt?: string;
  }>;
  loginClaims: Array<{
    claimedOn: string;
    goldAmount: number;
    costumeFrameId?: string | null;
    couponCode?: string | null;
    createdAt?: string;
  }>;
  seasonPass: {
    seasonId: string | null;
    seasonTitle: string | null;
    passEnabled: boolean;
    level: number;
    exp: number;
    gold: number;
    isPremium: boolean;
    claims: Array<{ id: string; level: number; track: string; claimedAt?: string }>;
    quests: Array<{ title: string; progress: number; target: number; completed: boolean }>;
  } | null;
  error?: string;
};

function ReclaimButton({
  disabled,
  busy,
  onClick,
}: {
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="shrink-0 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
    >
      {busy ? "회수 중..." : "회수"}
    </button>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("ko-KR");
}

export default function StudentRecoveryAdminPanel() {
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [goldAmount, setGoldAmount] = useState("0");
  const [message, setMessage] = useState<string | null>(null);
  const [data, setData] = useState<RecoveryPayload | null>(null);
  const [confirm, setConfirm] = useState<{
    kind: string;
    id?: string;
    amount?: number;
    label: string;
  } | null>(null);

  async function loadStudent(id: string) {
    const payload = (await adminApiFetch(
      `/api/admin/student-recovery?studentId=${encodeURIComponent(id)}`,
    )) as RecoveryPayload;
    if (payload.error) {
      setMessage(payload.error);
      setData(null);
      return;
    }
    setData(payload);
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    const id = studentId.trim();
    if (!id) {
      setMessage("학번을 입력해 주세요.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await loadStudent(id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "회수 정보를 불러오지 못했습니다.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function reclaim(kind: string, id?: string, amount?: number) {
    const student = data?.studentId || studentId.trim();
    if (!student) return;
    const label =
      kind === "gold"
        ? `골드 ${amount?.toLocaleString("ko-KR")}개를 회수할까요?`
        : kind === "season"
          ? "시즌패스 레벨·경험치·수령 보상을 회수할까요? 골드는 그대로 둡니다."
          : kind === "stamp" || kind === "stamp-all"
            ? "도장 진행도를 초기화할까요?"
            : "이 항목을 회수할까요? 학생 계정에서 바로 사라집니다.";
    setConfirm({ kind, id, amount, label });
  }

  async function confirmReclaim() {
    if (!confirm) return;
    const student = data?.studentId || studentId.trim();
    if (!student) return;
    const { kind, id, amount } = confirm;
    const actionKey = `${kind}:${id ?? amount ?? "gold"}`;
    setActing(actionKey);
    setMessage(null);
    try {
      const payload = (await adminApiFetch("/api/admin/student-recovery", {
        method: "PATCH",
        body: JSON.stringify({ studentId: student, kind, id, amount }),
      })) as { error?: string };
      if (payload.error) throw new Error(payload.error);
      setConfirm(null);
      await loadStudent(student);
      setMessage("회수했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "회수에 실패했습니다.");
    } finally {
      setActing(null);
    }
  }

  return (
    <AdminCollapsibleSection
      title="회수"
      description="사이트 · 로그인 · 회수에서 학번을 조회한 뒤, 코스튬·선물·골드·시즌패스·도장 이벤트·상점·접속보상을 바로 회수할 수 있습니다."
    >
      <form onSubmit={(event) => void handleSearch(event)} className="flex flex-wrap gap-2">
        <input
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
          placeholder="학번"
          className="min-w-[12rem] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "조회 중..." : "조회"}
        </button>
      </form>
      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}

      {data ? (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-gray-600">
            학번 <span className="font-mono font-semibold text-gray-900">{data.studentId}</span>
          </p>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">보관함 (코스튬 {data.frames.unlockedCount})</h3>
            <p className="mt-1 text-xs text-gray-500">
              착용 중: {data.frames.activeFrameId || "기본 스타일"}
            </p>
            {data.frames.items.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">해금된 코스튬이 없습니다.</p>
            ) : (
              <ul className="mt-2 divide-y divide-gray-100">
                {data.frames.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 py-2 text-sm">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-8 w-8 rounded border object-contain" />
                    ) : (
                      <span className="h-8 w-8 rounded border border-dashed" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className="text-xs text-gray-400">{item.source || ""}</span>
                    <ReclaimButton
                      disabled={Boolean(acting)}
                      busy={acting === `frame:${item.id}`}
                      onClick={() => void reclaim("frame", item.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">선물함 ({data.gifts.length})</h3>
            {data.gifts.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">선물함 내역이 없습니다.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {data.gifts.map((gift) => (
                  <li key={gift.id} className="flex justify-between gap-2">
                    <span className="truncate">{gift.reward_name || gift.id}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                      {gift.is_claimed ? "수령" : "미수령"} · {formatDate(gift.created_at)}
                      <ReclaimButton
                        disabled={Boolean(acting)}
                        busy={acting === `gift:${gift.id}`}
                        onClick={() => void reclaim("gift", gift.id)}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">보상 지급 내역 ({data.rewards.length})</h3>
            {data.rewards.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">관리자 보상 내역이 없습니다.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {data.rewards.map((reward) => (
                  <li key={reward.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {reward.title || reward.reward_type} · {reward.status}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                      {formatDate(reward.created_at)}
                      <ReclaimButton
                        disabled={Boolean(acting)}
                        busy={acting === `reward:${reward.id}`}
                        onClick={() => void reclaim("reward", reward.id)}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">골드</h3>
            <p className="mt-1 text-sm text-gray-700">
              보유 골드 {(data.seasonPass?.gold ?? 0).toLocaleString("ko-KR")}개
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                value={goldAmount}
                onChange={(event) => setGoldAmount(event.target.value)}
                className="w-28 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                placeholder="골드"
              />
              <button
                type="button"
                disabled={Boolean(acting) || !(Number(goldAmount) > 0)}
                onClick={() => void reclaim("gold", undefined, Math.floor(Number(goldAmount) || 0))}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 disabled:opacity-50"
              >
                {acting?.startsWith("gold:") ? "회수 중..." : "골드 회수"}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">시즌패스</h3>
            {!data.seasonPass?.seasonTitle && !data.seasonPass?.passEnabled ? (
              <p className="mt-2 text-sm text-gray-500">시즌패스 기록이 없습니다.</p>
            ) : (
              <div className="mt-2 space-y-1 text-sm text-gray-700">
                <p>시즌: {data.seasonPass.seasonTitle || "-"}</p>
                <p>
                  Lv.{data.seasonPass.level} · EXP {data.seasonPass.exp}
                  {data.seasonPass.isPremium ? " · 프리미엄" : ""}
                </p>
                <p>수령 보상 {data.seasonPass.claims.length}개</p>
                {data.seasonPass.quests.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-gray-500">
                    {data.seasonPass.quests.map((quest) => (
                      <li key={quest.title}>
                        {quest.title}: {quest.progress}/{quest.target}
                        {quest.completed ? " (완료)" : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ReclaimButton
                    disabled={Boolean(acting)}
                    busy={acting === "season:reset"}
                    onClick={() => void reclaim("season", "reset")}
                  />
                  <span className="text-xs text-gray-500">레벨·EXP·수령 보상 전체 회수 (골드는 유지)</span>
                </div>
                {data.seasonPass.isPremium ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ReclaimButton
                      disabled={Boolean(acting)}
                      busy={acting === "premium:premium"}
                      onClick={() => void reclaim("premium", "premium")}
                    />
                    <span className="text-xs text-gray-500">프리미엄 패스 회수</span>
                  </div>
                ) : null}
                {data.seasonPass.claims.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-sm">
                    {data.seasonPass.claims.map((claim) => (
                      <li key={claim.id} className="flex justify-between gap-2">
                        <span>
                          LV {claim.level} · {claim.track === "premium" ? "프리미엄" : "무료"}
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                          {formatDate(claim.claimedAt)}
                          <ReclaimButton
                            disabled={Boolean(acting)}
                            busy={acting === `claim:${claim.id}`}
                            onClick={() => void reclaim("claim", claim.id)}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">수령한 레벨 보상이 없습니다.</p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">골드 상점 구매 ({data.shopPurchases?.length ?? 0})</h3>
            {(data.shopPurchases ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">상점 구매 내역이 없습니다.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {data.shopPurchases.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {item.name} · {item.goldSpent.toLocaleString("ko-KR")} 골드
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                      {formatDate(item.createdAt)}
                      <ReclaimButton
                        disabled={Boolean(acting)}
                        busy={acting === `shop:${item.id}`}
                        onClick={() => void reclaim("shop", item.id)}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">접속 보상 ({data.loginClaims?.length ?? 0})</h3>
            {(data.loginClaims ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">접속 보상 내역이 없습니다.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {data.loginClaims.map((item) => (
                  <li key={item.claimedOn} className="flex justify-between gap-2">
                    <span className="truncate">
                      {item.claimedOn} · 골드 {item.goldAmount.toLocaleString("ko-KR")}
                      {item.costumeFrameId ? " · 코스튬" : ""}
                      {item.couponCode ? ` · ${item.couponCode}` : ""}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                      {formatDate(item.createdAt)}
                      <ReclaimButton
                        disabled={Boolean(acting)}
                        busy={acting === `login:${item.claimedOn}`}
                        onClick={() => void reclaim("login", item.claimedOn)}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">도장 이벤트 ({data.events.length})</h3>
            {data.events.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">도장 이벤트 진행 기록이 없습니다.</p>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ReclaimButton
                    disabled={Boolean(acting)}
                    busy={acting === "stamp-all:all"}
                    onClick={() => void reclaim("stamp-all", "all")}
                  />
                  <span className="text-xs text-gray-500">모든 도장 초기화</span>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {data.events.map((event) => (
                    <li key={String(event.eventId)} className="flex justify-between gap-2">
                      <span className="truncate">
                        {event.tabName ? `${event.tabName} · ` : ""}
                        {event.title} · 도장 {event.currentStamps}
                        {event.isCompleted ? " · 완료" : ""}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                        {formatDate(event.updatedAt)}
                        <ReclaimButton
                          disabled={Boolean(acting)}
                          busy={acting === `stamp:${event.eventId}`}
                          onClick={() => void reclaim("stamp", String(event.eventId))}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">인벤토리 ({data.inventory.length})</h3>
            {data.inventory.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">인벤토리 아이템이 없습니다.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {data.inventory.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {item.reward_name || item.id} · {item.category} · {item.source}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                      {formatDate(item.created_at)}
                      <ReclaimButton
                        disabled={Boolean(acting)}
                        busy={acting === `inventory:${item.id}`}
                        onClick={() => void reclaim("inventory", item.id)}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {confirm ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">회수 확인</h3>
            <p className="mt-2 text-sm text-gray-600">{confirm.label}</p>
            <p className="mt-1 text-xs text-gray-500">이 작업은 학생 계정에서 바로 반영됩니다.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={Boolean(acting)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void confirmReclaim()}
                disabled={Boolean(acting)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {acting ? "회수 중..." : "회수"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminCollapsibleSection>
  );
}
