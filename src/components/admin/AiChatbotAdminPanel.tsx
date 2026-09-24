"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { adminApiFetch, getAdminAccessToken } from "@/lib/admin-api";
import {
  CHATBOT_RECO_OPTIONS,
  type AiChatbotLesson,
  type AiChatbotLessonKind,
  type AiChatbotSettings,
} from "@/lib/ai-chatbot";
import { getStorageErrorMessage } from "@/lib/storage";

type AiChatbotAdminPanelProps = {
  onMessage: (message: string) => void;
};

const EMPTY: AiChatbotSettings = {
  enabled: true,
  name: "안내 봇",
  welcome_message: "안녕하세요. 제휴·혜택·이벤트에 대해 물어보세요.",
  login_greeting: "{name}님 안녕하세요",
  profile_bio: "제휴·혜택을 안내합니다.",
  icon_url: null,
  provider: "openai",
  api_key: "",
  has_api_key: false,
  lessons: [],
};

function newLesson(): AiChatbotLesson {
  return {
    id: crypto.randomUUID(),
    phrases: "",
    kind: "answer",
    answer: "",
    reco: "hangout",
  };
}

export default function AiChatbotAdminPanel({ onMessage }: AiChatbotAdminPanelProps) {
  const [settings, setSettings] = useState<AiChatbotSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const settingsPayload = (await adminApiFetch("/api/admin/ai-chatbot")) as {
        settings?: AiChatbotSettings;
        error?: string;
      };
      if (settingsPayload.error) throw new Error(settingsPayload.error);
      if (settingsPayload.settings) setSettings(settingsPayload.settings);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "AI 챗봇 설정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function uploadIcon(file: File) {
    setUploading(true);
    try {
      const token = await getAdminAccessToken();
      if (!token) throw new Error("관리자 로그인이 필요합니다.");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "ai-chatbot");
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "업로드 실패");
      setSettings((prev) => ({ ...prev, icon_url: payload.url ?? null }));
      onMessage("아이콘을 올렸습니다. 저장을 눌러 적용해 주세요.");
    } catch (error) {
      onMessage(getStorageErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = (await adminApiFetch("/api/admin/ai-chatbot", {
        method: "PATCH",
        body: JSON.stringify({
          enabled: settings.enabled,
          name: settings.name,
          welcome_message: settings.welcome_message,
          login_greeting: settings.login_greeting,
          profile_bio: settings.profile_bio,
          icon_url: settings.icon_url,
          provider: settings.provider,
          api_key: settings.api_key,
          lessons: settings.lessons,
        }),
      })) as { settings?: AiChatbotSettings };
      if (payload.settings) setSettings(payload.settings);
      onMessage("AI 챗봇 설정을 저장했습니다.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">AI 챗봇 설정을 불러오는 중...</p>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={(event) => void handleSave(event)}>
        <AdminCollapsibleSection title="AI 챗봇 (Beta)" description="베타 기능입니다. 제휴·게시판·이벤트 안내를 학습하고 바로 열 수 있습니다.">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            <span>
              AI 챗봇 활성화
              <span className="mt-0.5 block text-xs font-normal text-emerald-800">
                켜면 본페이지 오른쪽 아래에 채팅 버튼이 나타납니다. 외부 API 키 없이 사이트 제휴 정보로 답합니다.
              </span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={settings.enabled}
              onChange={(event) => setSettings((prev) => ({ ...prev, enabled: event.target.checked }))}
            />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-gray-500">
              봇 이름
              <input
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                value={settings.name}
                onChange={(event) => setSettings((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
            <label className="text-xs text-gray-500">
              AI 제공자
              <select
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                value={settings.provider}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    provider: event.target.value === "gemini" ? "gemini" : "openai",
                  }))
                }
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
            </label>
            <label className="text-xs text-gray-500 sm:col-span-2">
              프로필 소개
              <input
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                value={settings.profile_bio}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, profile_bio: event.target.value }))
                }
                placeholder="대화창 상단에 보이는 한 줄 소개"
              />
            </label>
            <label className="text-xs text-gray-500 sm:col-span-2">
              인사말 (비로그인)
              <textarea
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                rows={2}
                value={settings.welcome_message}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, welcome_message: event.target.value }))
                }
              />
            </label>
            <label className="text-xs text-gray-500 sm:col-span-2">
              학번 로그인 인사
              <textarea
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                rows={2}
                value={settings.login_greeting}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, login_greeting: event.target.value }))
                }
              />
              <span className="mt-1 block text-[11px] text-gray-400">
                {"{name}"}님 안녕하세요 처럼 쓸 수 있습니다. {"{name}"}, {"{studentId}"} 를 넣을 수 있습니다.
              </span>
            </label>
            <label className="text-xs text-gray-500 sm:col-span-2">
              API 키 (선택)
              <input
                type="password"
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                value={settings.api_key}
                placeholder={settings.has_api_key ? "저장됨 · 바꾸려면 새 키 입력" : "비워두면 사이트 정보로만 답합니다"}
                onChange={(event) => setSettings((prev) => ({ ...prev, api_key: event.target.value }))}
              />
            </label>
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-gray-700">프로필 사진</p>
            {settings.icon_url ? (
              <div className="mt-2 flex items-center gap-3">
                <img src={settings.icon_url} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-gray-200" />
                <button
                  type="button"
                  className="text-xs text-red-600 underline"
                  onClick={() => setSettings((prev) => ({ ...prev, icon_url: null }))}
                >
                  아이콘 삭제
                </button>
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-500">없으면 기본 말풍선 아이콘이 사용됩니다.</p>
            )}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              className="mt-2 block w-full text-xs"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void uploadIcon(file);
              }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "저장 중..." : "챗봇 설정 저장"}
          </button>
        </AdminCollapsibleSection>

        <AdminCollapsibleSection title="문장 학습">
          <p className="text-xs leading-5 text-gray-600">
            모델을 다시 학습시키는 기능이 아닙니다. 사용자가 보낸 말에 아래 표현이 들어가면, 지정한 답변·추천 분류·제휴
            검색·이벤트·게시판을 먼저 실행합니다. 표현은 쉼표 또는 줄바꿈으로 여러 개 넣을 수 있습니다. 최대 40개입니다.
          </p>

          <div className="mt-3 space-y-3">
            {settings.lessons.length === 0 ? (
              <p className="text-xs text-gray-500">아직 학습 문장이 없습니다. 아래 버튼으로 추가해 주세요.</p>
            ) : null}
            {settings.lessons.map((lesson, index) => (
              <div key={lesson.id} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-gray-800">학습 {index + 1}</p>
                  <button
                    type="button"
                    className="text-xs text-red-600 underline"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        lessons: prev.lessons.filter((item) => item.id !== lesson.id),
                      }))
                    }
                  >
                    삭제
                  </button>
                </div>
                <label className="mt-2 block text-xs text-gray-500">
                  이런 말을 하면
                  <textarea
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                    rows={2}
                    placeholder="예: 주말에 뭐하지, 심심해, 놀 곳 추천해줘"
                    value={lesson.phrases}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        lessons: prev.lessons.map((item) =>
                          item.id === lesson.id ? { ...item, phrases: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>
                <label className="mt-2 block text-xs text-gray-500">
                  이렇게 답하기
                  <select
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                    value={lesson.kind}
                    onChange={(event) => {
                      const kind = event.target.value as AiChatbotLessonKind;
                      setSettings((prev) => ({
                        ...prev,
                        lessons: prev.lessons.map((item) =>
                          item.id === lesson.id ? { ...item, kind } : item,
                        ),
                      }));
                    }}
                  >
                    <option value="answer">직접 답변</option>
                    <option value="recommend">추천 분류 실행</option>
                    <option value="search">제휴 검색</option>
                    <option value="events">진행 중 이벤트 안내</option>
                    <option value="board">게시판 열기</option>
                    <option value="season">시즌패스 열기</option>
                    <option value="shop">골드상점 열기</option>
                  </select>
                </label>
                {lesson.kind === "events" ? (
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    시즌패스·지도 이벤트·사이트 이벤트의 이름과 기간을 지금 진행 중인 것만 보여 줍니다. 문구를 따로 적을
                    필요는 없습니다.
                  </p>
                ) : lesson.kind === "board" ? (
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    게시판 팝업을 안내하고, 카드를 누르면 게시판(글쓰기 문장이면 글쓰기)을 엽니다. 기본 학습
                    (게시판·글쓰기·댓글·신고·목록·리스트 등)은 이미 들어 있습니다. 여기에는 추가로 알아듣게 할 말만
                    넣으면 됩니다.
                  </p>
                ) : lesson.kind === "season" ? (
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    시즌패스 팝업을 바로 엽니다. 문구를 따로 적을 필요는 없습니다.
                  </p>
                ) : lesson.kind === "shop" ? (
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    골드상점 팝업을 바로 엽니다. 문구를 따로 적을 필요는 없습니다.
                  </p>
                ) : lesson.kind === "recommend" ? (
                  <label className="mt-2 block text-xs text-gray-500">
                    추천 분류
                    <select
                      className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                      value={lesson.reco}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          lessons: prev.lessons.map((item) =>
                            item.id === lesson.id ? { ...item, reco: event.target.value } : item,
                          ),
                        }))
                      }
                    >
                      {CHATBOT_RECO_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="mt-2 block text-xs text-gray-500">
                    {lesson.kind === "search" ? "검색어" : "답변"}
                    <textarea
                      className="mt-1 w-full rounded border px-2 py-1.5 text-sm text-gray-900"
                      rows={2}
                      placeholder={
                        lesson.kind === "search" ? "예: 중국집, 빵, 생활시설" : "챗봇이 그대로 말할 내용"
                      }
                      value={lesson.answer}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          lessons: prev.lessons.map((item) =>
                            item.id === lesson.id ? { ...item, answer: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                  </label>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={settings.lessons.length >= 40}
            className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 disabled:opacity-50"
            onClick={() =>
              setSettings((prev) =>
                prev.lessons.length >= 40 ? prev : { ...prev, lessons: [...prev.lessons, newLesson()] },
              )
            }
          >
            학습 문장 추가
          </button>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "저장 중..." : "학습 내용 저장"}
          </button>
        </AdminCollapsibleSection>
      </form>
    </div>
  );
}
