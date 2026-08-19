"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { usePromptModal } from "@/components/PromptModalProvider";
import type { BannedIpRow } from "@/lib/board-ip-moderation";
import { requestIpBanReason } from "@/lib/board-ip-moderation";
import { supabase } from "@/lib/supabase";

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR");
}

export default function BoardBannedIpsAdminPanel({
  onChanged,
}: {
  onChanged?: () => void;
} = {}) {
  const { prompt } = usePromptModal();
  const [items, setItems] = useState<BannedIpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [ipAddress, setIpAddress] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("banned_ips")
      .select("id, ip_address, reason, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(
        error.message.includes("banned_ips")
          ? "Supabase SQL Editor에서 supabase/board-ip-moderation.sql을 실행해 주세요."
          : `차단 IP 목록 불러오기 실패: ${error.message}`,
      );
      setItems([]);
    } else {
      setItems(
        (data ?? []).map((row) => ({
          id: row.id,
          ip_address: String(row.ip_address),
          reason: row.reason,
          created_at: row.created_at,
        })),
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextIp = ipAddress.trim();
    if (!nextIp) {
      setMessage("IP 주소를 입력해 주세요.");
      return;
    }

    setSaving(true);
    setMessage("");

    const actionReason = await requestIpBanReason(prompt);
    if (actionReason === null) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("banned_ips").insert({
      ip_address: nextIp,
      reason: actionReason.trim() || null,
    });

    if (error) {
      setMessage(
        error.message.includes("duplicate")
          ? "이미 차단된 IP입니다."
          : `IP 차단 등록 실패: ${error.message}`,
      );
      setSaving(false);
      return;
    }

    setIpAddress("");
    setMessage("IP가 차단 목록에 추가되었습니다.");
    await loadItems();
    onChanged?.();
    setSaving(false);
  }

  async function removeItem(id: number) {
    setMessage("");
    const { error } = await supabase.from("banned_ips").delete().eq("id", id);

    if (error) {
      setMessage(`IP 차단 해제 실패: ${error.message}`);
      return;
    }

    setMessage("IP 차단이 해제되었습니다.");
    await loadItems();
    onChanged?.();
  }

  return (
    <AdminCollapsibleSection
      title="차단 IP 목록"
      description="차단된 IP에서는 비회원 게시글 작성이 거부됩니다. inet 형식(예: 123.45.67.89)으로 입력하세요. 차단 시 사유를 입력하면 사용자에게 팝업으로 표시됩니다."
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          IP 주소
          <input
            value={ipAddress}
            onChange={(event) => setIpAddress(event.target.value)}
            placeholder="123.45.67.89"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "등록 중..." : "IP 차단 추가"}
          </button>
        </div>
      </form>

      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
            <tr>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">사유</th>
              <th className="px-3 py-2">등록일</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-gray-500">
                  불러오는 중...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-gray-500">
                  차단된 IP가 없습니다.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono text-xs">{item.ip_address}</td>
                  <td className="px-3 py-2">{item.reason ?? "-"}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{formatDate(item.created_at)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => void removeItem(item.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      해제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminCollapsibleSection>
  );
}
