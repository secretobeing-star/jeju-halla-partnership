"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import {
  BoardDefinition,
  DEFAULT_BOARD_DEFINITIONS,
  createBoardId,
  getBoardDefinitions,
  getBoardIdMigrations,
  getBoardSectionHeaderColor,
  getBoardTabColor,
  hasDuplicateBoardIds,
  normalizeBoardColor,
  normalizeBoardDefinitions,
  normalizeBoardLabel,
  sanitizeBoardIdInput,
} from "@/lib/board-definitions";
import { migrateBoardPostTypes } from "@/lib/board-id-migration";
import { supabase } from "@/lib/supabase";

export default function BoardDefinitionsAdminPanel() {
  const [boardDefinitions, setBoardDefinitions] = useState<BoardDefinition[]>(
    DEFAULT_BOARD_DEFINITIONS,
  );
  const [boardDraft, setBoardDraft] = useState<BoardDefinition[]>(DEFAULT_BOARD_DEFINITIONS);
  const [initialBoards, setInitialBoards] = useState<BoardDefinition[]>(DEFAULT_BOARD_DEFINITIONS);
  const [headerColorDraft, setHeaderColorDraft] = useState<string | null>(null);
  const [boardSaving, setBoardSaving] = useState(false);
  const [boardMessage, setBoardMessage] = useState("");
  const [boardPageCreateEnabled, setBoardPageCreateEnabled] = useState(false);
  const [boardIdModeEnabled, setBoardIdModeEnabled] = useState(false);

  useEffect(() => {
    void supabase
      .from("site_settings")
      .select(
        "board_definitions, board_section_header_color, board_page_create_enabled, board_id_mode_enabled",
      )
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        const boards = getBoardDefinitions(data);
        setBoardDefinitions(boards);
        setBoardDraft(boards);
        setInitialBoards(boards);
        setHeaderColorDraft(normalizeBoardColor(data?.board_section_header_color) ?? null);
        setBoardPageCreateEnabled(data?.board_page_create_enabled ?? false);
        setBoardIdModeEnabled(data?.board_id_mode_enabled ?? false);
      });
  }, []);

  async function handleSaveBoardDefinitions(e: FormEvent) {
    e.preventDefault();
    setBoardSaving(true);
    setBoardMessage("");

    const nextBoards = normalizeBoardDefinitions(
      boardDraft.map((board) => ({
        ...board,
        label: normalizeBoardLabel(board.label, board.id),
      })),
    );

    if (hasDuplicateBoardIds(nextBoards)) {
      setBoardMessage("저장 실패: 게시판 ID가 중복되었습니다.");
      setBoardSaving(false);
      return;
    }

    const idMigrations = boardIdModeEnabled
      ? getBoardIdMigrations(initialBoards, nextBoards)
      : [];

    if (idMigrations.length > 0) {
      const { error: migrationError } = await migrateBoardPostTypes(idMigrations);
      if (migrationError) {
        setBoardMessage(
          `게시판 ID 변경 실패: ${migrationError.message}`,
        );
        setBoardSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("site_settings")
      .update({
        board_definitions: nextBoards,
        board_section_header_color: headerColorDraft,
      })
      .eq("id", 1);

    if (error) {
      setBoardMessage(`게시판 설정 저장 실패: ${error.message}`);
      setBoardSaving(false);
      return;
    }

    setBoardDefinitions(nextBoards);
    setBoardDraft(nextBoards);
    setInitialBoards(nextBoards);
    setBoardMessage("게시판 설정이 저장되었습니다.");
    setBoardSaving(false);
  }

  function addBoard() {
    if (!boardPageCreateEnabled) {
      setBoardMessage(
        "페이지 분류 생성은 개발자 모드에서 「페이지 분류 생성」을 활성화한 후 이용할 수 있습니다.",
      );
      return;
    }

    if (boardDraft.length >= 10) {
      setBoardMessage("게시판은 최대 10개까지 추가할 수 있습니다.");
      return;
    }

    const label = "새 게시판";
    const id = createBoardId(
      label,
      boardDraft.map((board) => board.id),
    );

    setBoardDraft((prev) => [
      ...prev,
      { id, label, enabled: true, allow_user_posts: true, posts_per_page: 5, color: null },
    ]);
    setBoardMessage("");
  }

  async function removeBoard(boardId: string) {
    if (boardDraft.length <= 1) {
      setBoardMessage("최소 1개의 게시판이 필요합니다.");
      return;
    }

    const { count, error: countError } = await supabase
      .from("board_posts")
      .select("id", { count: "exact", head: true })
      .eq("board_type", boardId);

    if (countError) {
      setBoardMessage(`게시판 확인 실패: ${countError.message}`);
      return;
    }

    if (count && count > 0) {
      const confirmed = window.confirm(
        `이 게시판에 게시글 ${count}개가 있습니다. 게시글도 함께 삭제됩니다. 계속하시겠습니까?`,
      );
      if (!confirmed) {
        return;
      }

      const { error: deleteError } = await supabase
        .from("board_posts")
        .delete()
        .eq("board_type", boardId);

      if (deleteError) {
        setBoardMessage(`게시글 삭제 실패: ${deleteError.message}`);
        return;
      }
    }

    setBoardDraft((prev) => prev.filter((board) => board.id !== boardId));
    setBoardMessage("");
  }

  return (
    <form onSubmit={handleSaveBoardDefinitions} className="space-y-6">
      <AdminCollapsibleSection
        title="게시판 관리"
        description="게시판을 추가·삭제하고 제목, 색상, 메인 표시, 사용자 글쓰기 여부를 설정합니다."
        headerActions={
          <button
            type="button"
            onClick={addBoard}
            disabled={!boardPageCreateEnabled}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            게시판 추가
          </button>
        }
      >
      {!boardPageCreateEnabled && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          새 게시판 추가는 <strong>개발자 모드 (Beta)</strong>에서 「페이지 분류 생성」을 활성화한
          후 이용할 수 있습니다. 기존 게시판 수정·삭제는 계속 가능합니다.
        </p>
      )}

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-800">게시판 헤더 색상</h3>
        <p className="mt-1 text-xs text-gray-500">
          메인 화면 상단 &quot;게시판&quot; 제목과 접기 버튼 영역 색상입니다.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block text-sm font-medium text-gray-700">
            헤더 색상
            <input
              type="color"
              value={getBoardSectionHeaderColor(headerColorDraft)}
              onChange={(e) => setHeaderColorDraft(e.target.value)}
              className="mt-1 block h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
            />
          </label>
          <button
            type="button"
            onClick={() => setHeaderColorDraft(null)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            기본 색상
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {boardDraft.map((board, index) => (
          <div key={`${board.id}-${index}`} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
              <label className="block text-sm font-medium text-gray-700">
                게시판 제목
                <input
                  value={board.label}
                  onChange={(e) =>
                    setBoardDraft((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, label: e.target.value } : item,
                      ),
                    )
                  }
                  maxLength={30}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>

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
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                활성화
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={board.allow_user_posts}
                  onChange={(e) =>
                    setBoardDraft((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, allow_user_posts: e.target.checked }
                          : item,
                      ),
                    )
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                사용자 글쓰기
              </label>

              <button
                type="button"
                onClick={() => void removeBoard(board.id)}
                disabled={boardDraft.length <= 1}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                삭제
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="block text-sm font-medium text-gray-700">
                탭 색상
                <input
                  type="color"
                  value={getBoardTabColor(board.color)}
                  onChange={(e) =>
                    setBoardDraft((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, color: e.target.value } : item,
                      ),
                    )
                  }
                  className="mt-1 block h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setBoardDraft((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, color: null } : item,
                    ),
                  )
                }
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                기본 색상
              </button>
            </div>
            {boardIdModeEnabled ? (
              <label className="mt-3 block text-xs font-medium text-gray-600">
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
              <p className="mt-2 text-xs text-gray-500">ID: {board.id}</p>
            )}
          </div>
        ))}
      </div>

      {!boardIdModeEnabled && (
        <p className="mt-3 text-xs text-gray-500">
          게시판 ID 수정은 <strong>개발자 모드 (Beta)</strong>에서 「ID 모드」를 활성화한 후 이용할 수
          있습니다.
        </p>
      )}

      {boardMessage && <p className="text-sm text-emerald-700">{boardMessage}</p>}
      <button
        type="submit"
        disabled={boardSaving}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {boardSaving ? "저장 중..." : "게시판 설정 저장"}
      </button>
      </AdminCollapsibleSection>
    </form>
  );
}
