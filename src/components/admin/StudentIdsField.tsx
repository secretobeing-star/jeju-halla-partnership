"use client";

import { useCallback, useState } from "react";
import { adminApiFetch } from "@/lib/admin-api";

type StudentIdsFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

export default function StudentIdsField({
  value,
  onChange,
  label = "학번 (쉼표·줄바꿈으로 여러 명)",
}: StudentIdsFieldProps) {
  const [loadingAll, setLoadingAll] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const selectAll = useCallback(async () => {
    setLoadingAll(true);
    setHint(null);
    try {
      const payload = (await adminApiFetch("/api/admin/student-ids")) as {
        studentIds?: string[];
        error?: string;
      };
      if (payload.error) {
        setHint(payload.error);
        return;
      }
      const ids = payload.studentIds ?? [];
      if (ids.length === 0) {
        setHint("선택할 학번이 없습니다. 로그인한 학생이나 승인 목록이 있어야 합니다.");
        return;
      }
      onChange(ids.join("\n"));
      setHint(`${ids.length}개 학번을 넣었습니다.`);
    } catch (error) {
      setHint(error instanceof Error ? error.message : "학번 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingAll(false);
    }
  }, [onChange]);

  return (
    <label className="block text-sm font-medium text-gray-700">
      <span className="flex items-center justify-between gap-2">
        {label}
        <button
          type="button"
          onClick={() => void selectAll()}
          disabled={loadingAll}
          className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50"
        >
          {loadingAll ? "불러오는 중..." : "학번 전체 선택"}
        </button>
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={"20241234\n20241235"}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500"
        required
      />
      {hint ? <span className="mt-1 block text-xs font-normal text-gray-500">{hint}</span> : null}
    </label>
  );
}
