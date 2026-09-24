"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { adminApiFetch } from "@/lib/admin-api";
import {
  DEFAULT_LOGIN_REWARD,
  formatLoginRewardTime,
  LOGIN_REWARD_WEEKDAY_LABELS,
  type LoginRewardSettings,
} from "@/lib/login-reward";
import { resolveCardFrameCatalog } from "@/lib/student-card-frames";
import { SiteSettings } from "@/lib/supabase";

type LoginRewardAdminPanelProps = {
  settings: SiteSettings;
};

export default function LoginRewardAdminPanel({ settings }: LoginRewardAdminPanelProps) {
  const frames = useMemo(
    () => resolveCardFrameCatalog(settings.site_student_card_frames),
    [settings.site_student_card_frames],
  );
  const [reward, setReward] = useState<LoginRewardSettings>(DEFAULT_LOGIN_REWARD);
  const [frameQuery, setFrameQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const costumeOptions = frames.filter((frame) => {
    const hay = `${frame.name} ${frame.id}`.toLowerCase();
    return hay.includes(frameQuery.trim().toLowerCase());
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = (await adminApiFetch("/api/admin/login-reward")) as {
        settings?: LoginRewardSettings;
        error?: string;
      };
      if (payload.error) {
        setMessage(payload.error);
        return;
      }
      if (payload.settings) setReward(payload.settings);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "접속 보상을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (reward.enabled && !reward.startDate) {
      setMessage("시작일과 시각을 설정해 주세요. 학생당 1회만 지급됩니다.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = (await adminApiFetch("/api/admin/login-reward", {
        method: "PATCH",
        body: JSON.stringify(reward),
      })) as { settings?: LoginRewardSettings; error?: string };
      if (payload.error) {
        setMessage(payload.error);
        return;
      }
      if (payload.settings) setReward(payload.settings);
      setMessage("접속 보상을 저장했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function toggleWeekday(value: number) {
    setReward((prev) => {
      const has = prev.weekdays.includes(value);
      const weekdays = has ? prev.weekdays.filter((day) => day !== value) : [...prev.weekdays, value];
      weekdays.sort((a, b) => a - b);
      return { ...prev, weekdays };
    });
  }

  return (
    <AdminCollapsibleSection
      title="접속 보상"
      description="설정한 시작일·시각부터 학생당 1회만 선물함으로 보냅니다. 매일 반복하지 않습니다. 종료일을 두면 그 날짜까지만 받을 수 있습니다."
    >
      <p className="mb-3 text-xs text-gray-500">
        DB: <code className="rounded bg-gray-100 px-1">supabase/site-login-reward.sql</code>
      </p>
      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중...</p>
      ) : (
        <form onSubmit={(event) => void handleSave(event)} className="space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm">
            접속 보상 사용
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={reward.enabled}
              onChange={(event) => setReward((prev) => ({ ...prev, enabled: event.target.checked }))}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            지급 골드
            <input
              type="number"
              min={0}
              value={reward.goldAmount}
              onChange={(event) =>
                setReward((prev) => ({ ...prev, goldAmount: Number(event.target.value) || 0 }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
            <span className="mt-1 block text-xs font-normal text-gray-500">0이면 골드는 보내지 않습니다. 보낸 골드는 선물함에서 받아야 들어갑니다.</span>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            지급 코스튬 (선택)
            <input
              value={frameQuery}
              onChange={(event) => setFrameQuery(event.target.value)}
              placeholder="이름·ID 검색"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <select
              value={reward.costumeFrameId}
              onChange={(event) => setReward((prev) => ({ ...prev, costumeFrameId: event.target.value }))}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            >
              <option value="">지급 안 함</option>
              {costumeOptions.map((frame) => (
                <option key={frame.id} value={frame.id}>
                  {frame.name || frame.id}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            지급 쿠폰 코드 (선택)
            <input
              value={reward.couponCode}
              onChange={(event) => setReward((prev) => ({ ...prev, couponCode: event.target.value }))}
              placeholder="학생이 받을 때 보이는 코드"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500"
            />
          </label>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
            <p className="text-sm font-medium text-gray-800">발송 예약</p>
            <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs">
              {(
                [
                  { id: "on_login" as const, label: "시각 이후 로그인 1회" },
                  { id: "scheduled" as const, label: "시각에 일괄 1회" },
                ]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
                    reward.scheduleMode === item.id ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setReward((prev) => ({ ...prev, scheduleMode: item.id }))}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                시작일
                <input
                  type="date"
                  required
                  value={reward.startDate}
                  onChange={(event) => setReward((prev) => ({ ...prev, startDate: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                종료일
                <input
                  type="date"
                  value={reward.endDate}
                  onChange={(event) => setReward((prev) => ({ ...prev, endDate: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              발송 시각 (한국 시간)
              <input
                type="time"
                value={formatLoginRewardTime(reward)}
                onChange={(event) => {
                  const [hour, minute] = event.target.value.split(":");
                  setReward((prev) => ({
                    ...prev,
                    sendHour: Number(hour) || 0,
                    sendMinute: Number(minute) || 0,
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
            <div>
              <p className="text-sm font-medium text-gray-700">요일</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {LOGIN_REWARD_WEEKDAY_LABELS.map((day) => {
                  const selected = reward.weekdays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeekday(day.value)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                        selected
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-gray-200 bg-white text-gray-600"
                      } ${reward.weekdays.length === 0 ? "opacity-70" : ""}`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {reward.weekdays.length === 0
                  ? "요일을 고르지 않으면 시작일부터 종료일까지 받을 수 있습니다."
                  : `선택한 요일에만 받을 수 있습니다.`}
                {` 시작일 ${reward.startDate || "(미설정)"} ${formatLoginRewardTime(reward)} 이후, 학생당 1회만 선물함으로 갑니다.`}
              </p>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              선물함 유효 기간 (일)
              <input
                type="number"
                min={0}
                value={reward.giftValidDays}
                onChange={(event) =>
                  setReward((prev) => ({
                    ...prev,
                    giftValidDays: Math.max(0, Math.floor(Number(event.target.value) || 0)),
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
              />
              <span className="mt-1 block text-xs font-normal text-gray-500">
                선물함에 들어간 뒤 이 기간이 지나면 받을 수 없습니다. 0이면 만료되지 않습니다.
              </span>
            </label>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm">
            푸시 알림 보내기
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={reward.pushEnabled}
              onChange={(event) => setReward((prev) => ({ ...prev, pushEnabled: event.target.checked }))}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            푸시 제목
            <input
              value={reward.pushTitle}
              onChange={(event) => setReward((prev) => ({ ...prev, pushTitle: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            푸시 내용
            <input
              value={reward.pushBody}
              onChange={(event) => setReward((prev) => ({ ...prev, pushBody: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
            <span className="mt-1 block text-xs font-normal text-gray-500">
              {"{gold}"} · {"{costume}"} · {"{coupon}"} 자리에 지급 내용이 들어갑니다.
            </span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "저장 중..." : "접속 보상 저장"}
          </button>
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        </form>
      )}
    </AdminCollapsibleSection>
  );
}
