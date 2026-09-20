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
  seasonPass: {
    seasonTitle: string | null;
    passEnabled: boolean;
    level: number;
    exp: number;
    gold: number;
    isPremium: boolean;
    claims: Array<{ level: number; track: string; claimed_at: string }>;
    quests: Array<{ title: string; progress: number; target: number; completed: boolean }>;
  } | null;
  error?: string;
};

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
        : "이 항목을 회수할까요? 학생 계정에서 바로 사라집니다.";
    if (!window.confirm(label)) return;
    const actionKey = `${kind}:${id ?? amount ?? "gold"}`;
    setActing(actionKey);
    setMessage(null);
    try {
      const payload = (await adminApiFetch("/api/admin/student-recovery", {
        method: "PATCH",
        body: JSON.stringify({ studentId: student, kind, id, amount }),
      })) as { error?: string };
      if (payload.error) throw new Error(payload.error);
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
      description="학번으로 보관함·선물함·시즌패스·지도 이벤트를 확인한 뒤, 관리자가 바로 회수할 수 있습니다."
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
                    <button
                      type="button"
                      disabled={Boolean(acting)}
                      onClick={() => void reclaim("frame", item.id)}
                      className="shrink-0 text-xs text-red-600 underline disabled:opacity-50"
                    >
                      {acting === `frame:${item.id}` ? "회수 중..." : "회수"}
                    </button>
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
                      <button
                        type="button"
                        disabled={Boolean(acting)}
                        onClick={() => void reclaim("gift", gift.id)}
                        className="text-red-600 underline disabled:opacity-50"
                      >
                        {acting === `gift:${gift.id}` ? "회수 중..." : "회수"}
                      </button>
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
                      <button
                        type="button"
                        disabled={Boolean(acting)}
                        onClick={() => void reclaim("reward", reward.id)}
                        className="text-red-600 underline disabled:opacity-50"
                      >
                        {acting === `reward:${reward.id}` ? "회수 중..." : "회수"}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">시즌패스</h3>
            {!data.seasonPass?.seasonTitle && !data.seasonPass?.passEnabled ? (
              <p className="mt-2 text-sm text-gray-500">시즌패스 기록이 없습니다.</p>
            ) : (
              <div className="mt-2 space-y-1 text-sm text-gray-700">
                <p>시즌: {data.seasonPass.seasonTitle || "-"}</p>
                <p>
                  Lv.{data.seasonPass.level} · EXP {data.seasonPass.exp} · 골드 {data.seasonPass.gold}
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
              </div>
            )}
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
            <h3 className="text-sm font-semibold text-gray-900">지도 이벤트 ({data.events.length})</h3>
            {data.events.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">이벤트 진행 기록이 없습니다.</p>
            ) : (
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
                      <button
                        type="button"
                        disabled={Boolean(acting)}
                        onClick={() => void reclaim("event", String(event.eventId))}
                        className="text-red-600 underline disabled:opacity-50"
                      >
                        {acting === `event:${event.eventId}` ? "회수 중..." : "회수"}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
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
                      <button
                        type="button"
                        disabled={Boolean(acting)}
                        onClick={() => void reclaim("inventory", item.id)}
                        className="text-red-600 underline disabled:opacity-50"
                      >
                        {acting === `inventory:${item.id}` ? "회수 중..." : "회수"}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </AdminCollapsibleSection>
  );
}
