"use client";

import { useMemo, useRef, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { createEmptyCardFrameItem, type CardFrameItem } from "@/data/cardFrames";
import { resolveCardFrameCatalog } from "@/lib/student-card-frames";
import { SiteSettings } from "@/lib/supabase";

type ExtendedCardFrameItem = CardFrameItem & {
  inboxTitle?: string;
  inboxDescription?: string;
};

type CardFramesAdminPanelProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  frameImageUploadingId?: string | null;
  onFrameImageUpload?: (frameId: string, file: File) => void | Promise<void>;
};

function createFrameId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `frame-${crypto.randomUUID()}`;
  }
  return `frame-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function CardFramesAdminPanel({
  settings,
  setSettings,
  frameImageUploadingId = null,
  onFrameImageUpload,
}: CardFramesAdminPanelProps) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [draftCodeVisible, setDraftCodeVisible] = useState<Record<string, boolean>>({});

  const frames = useMemo(
    () => resolveCardFrameCatalog(settings.site_student_card_frames) as ExtendedCardFrameItem[],
    [settings.site_student_card_frames],
  );

  function commitFrames(next: ExtendedCardFrameItem[]) {
    setSettings((prev) => ({
      ...prev,
      site_student_card_frames: next,
    }));
  }

  function updateFrame(id: string, patch: Partial<ExtendedCardFrameItem>) {
    commitFrames(
      frames.map((frame) => (frame.id === id ? { ...frame, ...patch } : frame)),
    );
  }

  function removeFrame(id: string) {
    commitFrames(frames.filter((frame) => frame.id !== id));
  }

  function addFrame() {
    commitFrames([
      ...frames,
      createEmptyCardFrameItem({
        id: createFrameId(),
        name: "새 코스튬",
        isDefaultUnlocked: false,
      }) as ExtendedCardFrameItem,
    ]);
  }

  return (
    <AdminCollapsibleSection
      title="학생증 · 코스튬 아이템"
      description="코스튬 이미지를 등록하고 보관함 제목 및 내용을 설정합니다."
    >
      <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600">
        <p className="font-semibold text-gray-800">학생증 · 사진 규격 (참고)</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>카드: ISO ID-1 비율 1.586 · 실물 약 8.56×5.40cm · 화면 약 384×242px</li>
          <li>코스튬 이미지: 카드와 동일 비율(가로:세로 ≈ 1.586:1) PNG/SVG 권장</li>
        </ul>
      </div>

      <div className="mt-4 space-y-4">
        {frames.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-sm text-gray-500">
            등록된 코스튬이 없습니다. 아래 버튼으로 추가해 주세요.
          </p>
        ) : null}

        {frames.map((frame) => {
          const uploading = frameImageUploadingId === frame.id;
          const showCode = draftCodeVisible[frame.id] ?? false;

          return (
            <div
              key={frame.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <label className="block text-sm font-medium text-gray-700">
                    코스튬 기본 이름
                    <input
                      value={frame.name}
                      onChange={(e) => updateFrame(frame.id, { name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => removeFrame(frame.id)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                >
                  삭제
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  ID
                  <input
                    value={frame.id}
                    onChange={(e) => {
                      const nextId = e.target.value.trim();
                      if (!nextId) return;
                      commitFrames(
                        frames.map((item) =>
                          item.id === frame.id ? { ...item, id: nextId } : item,
                        ),
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  시크릿 코드 (itemCode)
                  <div className="mt-1 flex gap-2">
                    <input
                      type={showCode ? "text" : "password"}
                      value={frame.itemCode}
                      onChange={(e) => updateFrame(frame.id, { itemCode: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraftCodeVisible((prev) => ({
                          ...prev,
                          [frame.id]: !showCode,
                        }))
                      }
                      className="shrink-0 rounded-lg border border-gray-300 px-2 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      {showCode ? "숨김" : "표시"}
                    </button>
                  </div>
                </label>
              </div>

              {/* 보관함 전용 설정 영역 */}
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-3">
                <p className="text-xs font-bold text-emerald-900">📦 보관함 표시 설정</p>
                <label className="block text-xs font-medium text-gray-700">
                  보관함 제목
                  <input
                    value={frame.inboxTitle ?? ""}
                    onChange={(e) => updateFrame(frame.id, { inboxTitle: e.target.value })}
                    placeholder={frame.name || "보관함에 표시될 제목을 입력하세요"}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="block text-xs font-medium text-gray-700">
                  보관함 내용 (줄바꿈 및 띄어쓰기 완전 지원)
                  <textarea
                    value={frame.inboxDescription ?? frame.description ?? ""}
                    onChange={(e) =>
                      updateFrame(frame.id, {
                        inboxDescription: e.target.value,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="보관함에서 표시될 상세 설명을 입력하세요 (엔터 줄바꿈 및 스페이스 띄어쓰기 유지)"
                    style={{ whiteSpace: "pre-wrap" }}
                    className="mt-1 w-full whitespace-pre-wrap rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 font-sans"
                  />
                </label>
              </div>

              <label className="mt-3 block text-sm font-medium text-gray-700">
                이미지 URL / Data URL
                <input
                  value={frame.imageUrl}
                  onChange={(e) => updateFrame(frame.id, { imageUrl: e.target.value })}
                  placeholder="https://... 또는 /path/to/frame.png"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  ref={(el) => {
                    fileInputRefs.current[frame.id] = el;
                  }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="sr-only"
                  disabled={uploading || !onFrameImageUpload}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onFrameImageUpload) {
                      void onFrameImageUpload(frame.id, file);
                    }
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={uploading || !onFrameImageUpload}
                  onClick={() => fileInputRefs.current[frame.id]?.click()}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                >
                  {uploading ? "업로드 중..." : "이미지 업로드"}
                </button>
                {frame.imageUrl ? (
                  <div className="h-14 w-14 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    <img
                      src={frame.imageUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : null}
              </div>

              <label className="mt-3 block text-sm font-medium text-gray-700">
                CSS border (선택)
                <input
                  value={frame.cssBorder ?? ""}
                  onChange={(e) => updateFrame(frame.id, { cssBorder: e.target.value })}
                  placeholder="예: 3px solid #10b981"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500"
                />
              </label>

              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={frame.isDefaultUnlocked}
                  onChange={(e) =>
                    updateFrame(frame.id, { isDefaultUnlocked: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                기본 제공(코드 없이 해금)
              </label>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addFrame}
        className="mt-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        + 코스튬 아이템 추가
      </button>
    </AdminCollapsibleSection>
  );
}