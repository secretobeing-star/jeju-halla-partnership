"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import MainBoardPositionAdminSection from "@/components/admin/MainBoardPositionAdminSection";
import {
  DEFAULT_BOARD_DEFINITIONS,
  getBoardDefinitions,
  getBoardIdMigrations,
  hasDuplicateBoardIds,
  normalizeBoardDefinitions,
  sanitizeBoardIdInput,
} from "@/lib/board-definitions";
import { migrateBoardPostTypes } from "@/lib/board-id-migration";
import { normalizeBoardPostsPerPage } from "@/lib/pagination-settings";
import {
  DEFAULT_BOARD_LIST_FONT_SIZE_COMPACT,
  DEFAULT_BOARD_LIST_FONT_SIZE_DESKTOP,
  DEFAULT_BOARD_POST_DETAIL_FONT_SIZE,
  normalizeBoardListFontSize,
  normalizeBoardPostDetailFontSize,
} from "@/lib/board-list-font-size";
import { BoardDefinition, SiteSettings } from "@/lib/supabase";

type BoardSettingsPanelProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  saveSettings: (next: SiteSettings) => Promise<{ error: { message: string } | null }>;
  onMessage: (message: string) => void;
};

type BoardDraftItem = BoardDefinition & { sourceId: string };

function toBoardDraft(boards: BoardDefinition[]): BoardDraftItem[] {
  return boards.map((board) => ({ ...board, sourceId: board.id }));
}

function moveBoardItem(items: BoardDraftItem[], index: number, direction: -1 | 1) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }

  const next = [...items];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

export default function BoardSettingsPanel({
  settings,
  setSettings,
  saveSettings,
  onMessage,
}: BoardSettingsPanelProps) {
  const [boardDraft, setBoardDraft] = useState<BoardDraftItem[]>(
    toBoardDraft(settings.board_definitions ?? DEFAULT_BOARD_DEFINITIONS),
  );
  const [initialBoards, setInitialBoards] = useState<BoardDefinition[]>(
    getBoardDefinitions(settings),
  );
  const [saving, setSaving] = useState(false);
  const boardIdModeEnabled = settings.board_id_mode_enabled ?? false;

  useEffect(() => {
    const boards = getBoardDefinitions(settings);
    setBoardDraft(toBoardDraft(boards));
    setInitialBoards(boards);
  }, [settings.board_definitions]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onMessage("");

    const nextBoards = normalizeBoardDefinitions(
      boardDraft.map((board) => ({
        ...board,
        posts_per_page: normalizeBoardPostsPerPage(board.posts_per_page),
      })),
    );

    if (hasDuplicateBoardIds(nextBoards)) {
      onMessage("저장 실패: 게시판 ID가 중복되었습니다.");
      setSaving(false);
      return;
    }

    const idMigrations = boardIdModeEnabled ? getBoardIdMigrations(initialBoards, boardDraft) : [];

    if (idMigrations.length > 0) {
      const { error: migrationError } = await migrateBoardPostTypes(idMigrations);
      if (migrationError) {
        onMessage(`저장 실패: 게시판 ID 변경 중 오류가 발생했습니다. ${migrationError.message}`);
        setSaving(false);
        return;
      }
    }

    const nextSettings: SiteSettings = {
      ...settings,
      board_definitions: nextBoards,
      board_list_font_size_compact: normalizeBoardListFontSize(
        settings.board_list_font_size_compact,
        DEFAULT_BOARD_LIST_FONT_SIZE_COMPACT,
      ),
      board_list_font_size_desktop: normalizeBoardListFontSize(
        settings.board_list_font_size_desktop,
        DEFAULT_BOARD_LIST_FONT_SIZE_DESKTOP,
      ),
      board_post_detail_font_size: normalizeBoardPostDetailFontSize(
        settings.board_post_detail_font_size,
      ),
    };

    const { error } = await saveSettings(nextSettings);
    if (error) {
      onMessage(`저장 실패: ${error.message}`);
      setSaving(false);
      return;
    }

    setSettings(nextSettings);
    setBoardDraft(toBoardDraft(nextBoards));
    setInitialBoards(nextBoards);
    onMessage("게시글 분류 설정이 저장되었습니다.");
    setSaving(false);
  }

  function toggleSetting(key: keyof SiteSettings, value: boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-admin-primary-form>
      <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        메인 화면 게시판 표시, 위치, 정렬, 글자 크기 등을 설정합니다. 게시판 종류·탭 추가는{" "}
        <strong>게시판 종류</strong>, 글 목록·고정은 <strong>게시글 관리</strong>에서 하세요.
        제휴 목록·정렬은 <strong>제휴 › 목록·지도·정렬</strong>에서 설정합니다.
      </p>
      <AdminCollapsibleSection
        title="게시판별 목록 설정"
        description="제휴를 제외한 각 게시판의 탭 순서, 페이지당 게시글 수를 설정합니다. 위·아래 버튼으로 메인 화면 탭 순서를 바꿀 수 있습니다."
      >
        <div className="space-y-3">
          {boardDraft.map((board, index) => (
            <div
              key={board.sourceId}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-gray-900">{board.label}</p>
                  <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-500">
                    {index + 1}번째 탭
                  </span>
                </div>
                {boardIdModeEnabled ? (
                  <label className="block text-xs font-medium text-gray-600">
                    게시판 ID
                    <input
                      type="text"
                      value={board.id}
                      onChange={(e) =>
                        setBoardDraft((prev) =>
                          prev.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, id: sanitizeBoardIdInput(e.target.value) }
                              : item,
                          ),
                        )
                      }
                      className="mt-1 w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500"
                    />
                  </label>
                ) : (
                  <p className="text-xs text-gray-500">ID: {board.id}</p>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500">탭 순서</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setBoardDraft((prev) => moveBoardItem(prev, index, -1))}
                      disabled={index === 0}
                      className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`${board.label} 탭을 위로`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => setBoardDraft((prev) => moveBoardItem(prev, index, 1))}
                      disabled={index === boardDraft.length - 1}
                      className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`${board.label} 탭을 아래로`}
                    >
                      ↓
                    </button>
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={board.enabled}
                    onChange={(e) =>
                      setBoardDraft((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, enabled: e.target.checked } : item,
                        ),
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                  />
                  활성화
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  페이지당 게시글 수
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={board.posts_per_page}
                    onChange={(e) =>
                      setBoardDraft((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                posts_per_page: normalizeBoardPostsPerPage(
                                  Number(e.target.value),
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                    className="mt-1 w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        {!boardIdModeEnabled && (
          <p className="mt-3 text-xs text-gray-500">
            게시판 ID 수정은 <strong>개발자 모드 (Beta)</strong>에서 「ID 모드」를 활성화한 후 이용할
            수 있습니다.
          </p>
        )}
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="게시글 글자 크기"
        description="메인 게시판 목록과 게시글 본문의 글자 크기를 조절합니다. 커뮤니티형 목록이 켜져 있을 때 목록 설정이 적용됩니다. 고정 게시글 크게 표시는 이전과 동일한 크기(모바일 12px · PC 13px)를 유지합니다."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium text-gray-700">
            목록 글자 (모바일·폴드)
            <input
              type="number"
              min={8}
              max={18}
              value={settings.board_list_font_size_compact ?? DEFAULT_BOARD_LIST_FONT_SIZE_COMPACT}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  board_list_font_size_compact: normalizeBoardListFontSize(
                    Number(e.target.value),
                    DEFAULT_BOARD_LIST_FONT_SIZE_COMPACT,
                  ),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
            <span className="mt-1 block text-xs text-gray-500">8~18px · 기본 10px</span>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            목록 글자 (PC)
            <input
              type="number"
              min={8}
              max={18}
              value={settings.board_list_font_size_desktop ?? DEFAULT_BOARD_LIST_FONT_SIZE_DESKTOP}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  board_list_font_size_desktop: normalizeBoardListFontSize(
                    Number(e.target.value),
                    DEFAULT_BOARD_LIST_FONT_SIZE_DESKTOP,
                  ),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
            <span className="mt-1 block text-xs text-gray-500">8~18px · 기본 11px</span>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            본문 글자
            <input
              type="number"
              min={12}
              max={24}
              value={settings.board_post_detail_font_size ?? DEFAULT_BOARD_POST_DETAIL_FONT_SIZE}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  board_post_detail_font_size: normalizeBoardPostDetailFontSize(
                    Number(e.target.value),
                  ),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
            <span className="mt-1 block text-xs text-gray-500">12~24px · 기본 16px</span>
          </label>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="게시글 기능 설정">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.post_reactions_enabled ?? true}
              onChange={(e) => toggleSetting("post_reactions_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            추천/비추천 활성화
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.board_sort_latest_enabled ?? true}
              onChange={(e) => toggleSetting("board_sort_latest_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            최신순 정렬 활성화
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.board_list_refresh_enabled ?? true}
              onChange={(e) => toggleSetting("board_list_refresh_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            게시글 목록 새로고침 활성화
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.board_sort_recommended_enabled ?? true}
              onChange={(e) =>
                toggleSetting("board_sort_recommended_enabled", e.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            추천순 정렬 활성화
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.board_sort_views_enabled ?? true}
              onChange={(e) => toggleSetting("board_sort_views_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            조회수 순 정렬 활성화
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.board_collapsible_enabled ?? true}
              onChange={(e) => toggleSetting("board_collapsible_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            게시판 탭 접기/펼치기 활성화
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.board_pinned_post_large_enabled ?? false}
              onChange={(e) =>
                toggleSetting("board_pinned_post_large_enabled", e.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            고정 게시글 크게 표시
            <span className="text-xs text-gray-500">(관리자가 고정한 글만 목록에서 글자를 크게 표시)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.board_inline_enabled ?? true}
              onChange={(e) => toggleSetting("board_inline_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            메인 본문에 게시판 표시
            <span className="text-xs text-gray-500">
              (본문에 표시되는 게시판만 켜고 끕니다. 상단 메뉴 팝업은 별도로 계속 사용할 수 있습니다)
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.board_post_popup_enabled ?? true}
              onChange={(e) => toggleSetting("board_post_popup_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            게시글·제휴 자세히 보기
            <span className="text-xs text-gray-500">
              (게시글은 팝업으로 열립니다. 제휴 카드는 기존 그대로 두고, 상세 설명·지도가 있는 업체만
              &quot;자세히 보기&quot; 버튼이 표시됩니다)
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.board_post_numbered_list_enabled ?? false}
              onChange={(e) =>
                toggleSetting("board_post_numbered_list_enabled", e.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            게시글 커뮤니티형 목록 표시
            <span className="text-xs text-gray-500">(번호 · 제목 [댓글] · 글쓴이 · 날짜 · 추천)</span>
          </label>
        </div>
      </AdminCollapsibleSection>

      <MainBoardPositionAdminSection settings={settings} setSettings={setSettings} />

      <AdminCollapsibleSection
        title="숨김 게시글 안내 문구"
        description="관리자가 숨김 처리한 게시글을 메인 게시판에서 보여줄 때 사용할 제목과 내용입니다. 비우면 기본 문구가 표시됩니다."
      >
        <div className="grid gap-4">
          <label className="block text-sm font-medium text-gray-700">
            숨김 제목
            <input
              value={settings.board_hidden_post_title ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  board_hidden_post_title: e.target.value.trim() ? e.target.value : null,
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            숨김 내용
            <textarea
              value={settings.board_hidden_post_message ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  board_hidden_post_message: e.target.value.trim() ? e.target.value : null,
                }))
              }
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
        </div>
      </AdminCollapsibleSection>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving ? "저장 중..." : "게시글 분류 설정 저장"}
      </button>
    </form>
  );
}
