"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { usePromptModal } from "@/components/PromptModalProvider";
import {
  formatVoterKeyLabel,
  requestDeviceBanReason,
  type BannedVoterKeyRow,
} from "@/lib/board-device-moderation";
import { supabase } from "@/lib/supabase";

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR");
}

export default function BoardBannedVoterKeysAdminPanel({
  onChanged,
}: {
  onChanged?: () => void;
} = {}) {
  const { prompt } = usePromptModal();
  const [items, setItems] = useState<BannedVoterKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [voterKey, setVoterKey] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("banned_voter_keys")
      .select("id, voter_key, reason, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(
        error.message.includes("banned_voter_keys")
          ? "Supabase SQL Editor에서 supabase/device-voter-key-ban.sql을 실행해 주세요."
          : `차단 기기 목록 불러오기 실패: ${error.message}`,
      );
      setItems([]);
    } else {
      setItems(
        (data ?? []).map((row) => ({
          id: row.id,
          voter_key: String(row.voter_key),
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
    const nextKey = voterKey.trim();
    if (!nextKey || nextKey.length < 8) {
      setMessage("기기 키(voter key)를 8자 이상 입력해 주세요.");
      return;
    }

    setSaving(true);
    setMessage("");

    const actionReason = await requestDeviceBanReason(prompt);
    if (actionReason === null) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("banned_voter_keys").insert({
      voter_key: nextKey,
      reason: actionReason.trim() || null,
    });

    if (error) {
      setMessage(
        error.message.includes("duplicate")
          ? "이미 차단된 기기입니다."
          : `기기 차단 등록 실패: ${error.message}`,
      );
      setSaving(false);
      return;
    }

    setVoterKey("");
    setMessage("기기가 차단 목록에 추가되었습니다.");
    await loadItems();
    onChanged?.();
    setSaving(false);
  }

  async function removeItem(id: number) {
    setMessage("");
    const { error } = await supabase.from("banned_voter_keys").delete().eq("id", id);

    if (error) {
      setMessage(`기기 차단 해제 실패: ${error.message}`);
      return;
    }

    setMessage("기기 차단이 해제되었습니다.");
    await loadItems();
    onChanged?.();
  }

  return (
    <AdminCollapsibleSection
      title="차단 기기 목록"
      description="차단된 브라우저(기기 키)에서는 비회원 게시글·댓글·후기 작성이 거부됩니다. 활동 목록에서 복사하거나 UUID 형식 키를 직접 입력하세요."
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          기기 키 (voter key)
          <input
            value={voterKey}
            onChange={(event) => setVoterKey(event.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "등록 중..." : "기기 차단 추가"}
          </button>
        </div>
      </form>

      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
            <tr>
              <th className="px-3 py-2">기기 키</th>
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
                  차단된 기기가 없습니다.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono text-xs" title={item.voter_key}>
                    {formatVoterKeyLabel(item.voter_key)}
                  </td>
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
