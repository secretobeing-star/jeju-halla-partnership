"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  formatChatbotLoginGreeting,
  requestOpenChatbotCard,
  type AiChatbotPublicConfig,
  type ChatbotIntent,
  type ChatbotPartnerCard,
} from "@/lib/ai-chatbot";
import { getSiteMemberSession, SITE_MEMBER_SESSION_EVENT } from "@/lib/site-member-session";
import { trackSiteAnalytics } from "@/lib/site-analytics";

type ChatLine = {
  role: "user" | "assistant";
  content: string;
  choices?: string[];
  hasMore?: boolean;
  moreIntent?: ChatbotIntent | null;
  cards?: ChatbotPartnerCard[];
  openPopup?: "season" | "shop";
};

const THREAD_KEY = "halla-ai-chatbot-thread";
const SIZE_KEY = "halla-ai-chatbot-size";
const PC_QUERY = "(min-width: 1024px)";
const DEFAULT_SIZE = { width: 360, height: 500 };
const MIN_SIZE = { width: 320, height: 380 };

function readThread(): ChatLine[] {
  try {
    const raw = sessionStorage.getItem(THREAD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function clampSize(width: number, height: number) {
  const maxWidth = Math.max(MIN_SIZE.width, Math.round(window.innerWidth * 0.72));
  const maxHeight = Math.max(MIN_SIZE.height, Math.round(window.innerHeight * 0.86));
  return {
    width: Math.min(maxWidth, Math.max(MIN_SIZE.width, Math.round(width))),
    height: Math.min(maxHeight, Math.max(MIN_SIZE.height, Math.round(height))),
  };
}

function readSize() {
  try {
    const raw = localStorage.getItem(SIZE_KEY);
    if (!raw) return DEFAULT_SIZE;
    const parsed = JSON.parse(raw) as { width?: number; height?: number };
    return clampSize(Number(parsed.width) || DEFAULT_SIZE.width, Number(parsed.height) || DEFAULT_SIZE.height);
  } catch {
    return DEFAULT_SIZE;
  }
}

export default function AiChatbotWidget() {
  const [config, setConfig] = useState<AiChatbotPublicConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);
  const [isPc, setIsPc] = useState(false);
  const [panelSize, setPanelSize] = useState(DEFAULT_SIZE);

  useEffect(() => {
    setLines(readThread());
    const media = window.matchMedia(PC_QUERY);
    const syncPc = () => setIsPc(media.matches);
    syncPc();
    media.addEventListener("change", syncPc);
    setPanelSize(readSize());
    return () => media.removeEventListener("change", syncPc);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/ai-chatbot/config")
      .then((res) => res.json())
      .then((payload: { config?: AiChatbotPublicConfig | null }) => {
        if (!cancelled) setConfig(payload.config ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!config || seededRef.current) return;
    seededRef.current = true;
    setLines((prev) => {
      if (prev.length > 0) return prev;
      const student = getSiteMemberSession()?.student;
      return [
        {
          role: "assistant",
          content: formatChatbotLoginGreeting(config.login_greeting, student ?? {}, config.welcome_message),
        },
      ];
    });
  }, [config]);

  useEffect(() => {
    function syncGreeting() {
      if (!config) return;
      const student = getSiteMemberSession()?.student;
      const next = formatChatbotLoginGreeting(config.login_greeting, student ?? {}, config.welcome_message);
      setLines((prev) => {
        if (prev.length === 0) return [{ role: "assistant", content: next }];
        if (prev.length === 1 && prev[0]?.role === "assistant") {
          return [{ ...prev[0], content: next }];
        }
        return prev;
      });
    }
    window.addEventListener(SITE_MEMBER_SESSION_EVENT, syncGreeting);
    return () => window.removeEventListener(SITE_MEMBER_SESSION_EVENT, syncGreeting);
  }, [config]);

  useEffect(() => {
    if (!seededRef.current) return;
    try {
      sessionStorage.setItem(THREAD_KEY, JSON.stringify(lines));
    } catch {
      // ignore quota
    }
  }, [lines]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [lines, open]);

  if (!config) return null;

  async function ask(history: ChatLine[], intent?: ChatbotIntent | null) {
    const response = await fetch("/api/ai-chatbot/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: intent ?? null,
        messages: history
          .filter((item) => item.content.trim())
          .map((item) => ({ role: item.role, content: item.content })),
      }),
    });
    const payload = (await response.json()) as {
      reply?: string;
      error?: string;
      choices?: string[];
      hasMore?: boolean;
      moreIntent?: ChatbotIntent | null;
      cards?: ChatbotPartnerCard[];
      openPopup?: "season" | "shop";
    };
    if (!response.ok) throw new Error(payload.error || "답변을 받지 못했습니다.");
    return {
      role: "assistant" as const,
      content: payload.reply || "",
      choices: payload.choices ?? [],
      hasMore: Boolean(payload.hasMore),
      moreIntent: payload.moreIntent ?? null,
      cards: payload.cards ?? [],
      openPopup: payload.openPopup,
    };
  }

  async function sendText(text: string, intent?: ChatbotIntent | null) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const nextLines = [...lines, { role: "user" as const, content: trimmed }];
    setLines(nextLines);
    setInput("");
    setBusy(true);
    try {
      const reply = await ask(nextLines, intent);
      setLines([...nextLines, reply]);
      if (reply.openPopup === "season" || reply.openPopup === "shop") {
        requestOpenChatbotCard({
          id: reply.openPopup,
          name: "",
          category: "",
          region: "",
          benefit: "",
          address: "",
          image_url: null,
          openKind: reply.openPopup === "shop" ? "shop" : "season",
        });
        setOpen(false);
      }
    } catch (error) {
      setLines([
        ...nextLines,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function sendMore(intent: ChatbotIntent) {
    if (busy) return;
    setBusy(true);
    try {
      const lastUser = [...lines].reverse().find((item) => item.role === "user");
      const reply = await ask(
        [...lines, { role: "user", content: lastUser?.content || "더보기" }],
        intent,
      );
      setLines((prev) => [...prev, reply]);
    } catch (error) {
      setLines((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    void sendText(input);
  }

  function startResize(event: React.PointerEvent<HTMLButtonElement>) {
    if (!isPc) return;
    event.preventDefault();
    const handle = event.currentTarget;
    const originX = event.clientX;
    const originY = event.clientY;
    const origin = { ...panelSize };
    handle.setPointerCapture(event.pointerId);

    function onMove(moveEvent: PointerEvent) {
      const next = clampSize(
        origin.width + (originX - moveEvent.clientX),
        origin.height + (originY - moveEvent.clientY),
      );
      setPanelSize(next);
    }

    function onUp(upEvent: PointerEvent) {
      handle.releasePointerCapture(upEvent.pointerId);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      setPanelSize((current) => {
        try {
          localStorage.setItem(SIZE_KEY, JSON.stringify(current));
        } catch {
          // ignore
        }
        return current;
      });
    }

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  return (
    <div className="ai-chatbot">
      {open ? (
        <div
          className={`ai-chatbot__panel${isPc ? " is-pc-resizable" : ""}`}
          role="dialog"
          aria-label={config.name}
          style={
            isPc
              ? { width: `${panelSize.width}px`, height: `${panelSize.height}px` }
              : undefined
          }
        >
          {isPc ? (
            <button
              type="button"
              className="ai-chatbot__resize"
              aria-label="챗봇 크기 조절"
              title="드래그해서 크기 조절"
              onPointerDown={startResize}
            />
          ) : null}
          <header className="ai-chatbot__head">
            <div className="ai-chatbot__profile">
              <span className="ai-chatbot__avatar">
                {config.icon_url ? <img src={config.icon_url} alt="" /> : <span aria-hidden>💬</span>}
              </span>
              <span className="ai-chatbot__identity">
                <span className="ai-chatbot__name-row">
                  <span className="ai-chatbot__name">{config.name}</span>
                  <span className="ai-chatbot__beta">Beta</span>
                </span>
                <span className="ai-chatbot__bio">{config.profile_bio}</span>
              </span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="닫기">
              ×
            </button>
          </header>
          <div className="ai-chatbot__list" ref={listRef}>
            <div className="ai-chatbot__intro">
              <span className="ai-chatbot__intro-avatar">
                {config.icon_url ? <img src={config.icon_url} alt="" /> : <span aria-hidden>💬</span>}
              </span>
              <p className="ai-chatbot__intro-name">
                {config.name}
                <span className="ai-chatbot__beta">Beta</span>
              </p>
              <p className="ai-chatbot__intro-bio">{config.profile_bio}</p>
            </div>
            {lines.map((line, index) => (
              <div key={`${line.role}-${index}`} className={`ai-chatbot__turn ${line.role === "user" ? "is-user" : "is-bot"}`}>
                {line.role === "assistant" ? (
                  <div className="ai-chatbot__msg-profile">
                    <span className="ai-chatbot__msg-avatar">
                      {config.icon_url ? <img src={config.icon_url} alt="" /> : <span aria-hidden>💬</span>}
                    </span>
                    <span className="ai-chatbot__msg-name">
                      {config.name}
                      <span className="ai-chatbot__beta ai-chatbot__beta--compact">Beta</span>
                    </span>
                  </div>
                ) : null}
                <p className={`ai-chatbot__bubble ${line.role === "user" ? "is-user" : "is-bot"}`}>
                  {line.content}
                </p>
                {line.cards && line.cards.length > 0 ? (
                  <div className="ai-chatbot__cards">
                    {line.cards.map((card) => (
                      <button
                        key={`${card.id}-${card.name}`}
                        type="button"
                        className="ai-chatbot__card"
                        onClick={() => {
                          requestOpenChatbotCard(card);
                          setOpen(false);
                        }}
                      >
                        {card.image_url ? (
                          <img src={card.image_url} alt="" className="ai-chatbot__card-photo" />
                        ) : (
                          <div className="ai-chatbot__card-photo is-empty">
                            {card.openKind === "board"
                              ? "게시판"
                              : card.openKind === "season"
                                ? "시즌패스"
                                : card.openKind === "shop"
                                  ? "골드상점"
                                  : "사진 없음"}
                          </div>
                        )}
                        <div className="ai-chatbot__card-body">
                          <p className="ai-chatbot__card-name">{card.name}</p>
                          <p className="ai-chatbot__card-meta">
                            {[card.category, card.region].filter(Boolean).join(" · ")}
                          </p>
                          {card.benefit ? <p className="ai-chatbot__card-benefit">{card.benefit}</p> : null}
                          {card.address ? <p className="ai-chatbot__card-address">{card.address}</p> : null}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
                {line.choices && line.choices.length > 0 ? (
                  <div className="ai-chatbot__choices">
                    {line.choices.map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        disabled={busy}
                        onClick={() => void sendText(`${choice} 찾아줘`)}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                ) : null}
                {line.hasMore && line.moreIntent ? (
                  <button
                    type="button"
                    className="ai-chatbot__more"
                    disabled={busy}
                    onClick={() => void sendMore(line.moreIntent as ChatbotIntent)}
                  >
                    더보기
                  </button>
                ) : null}
              </div>
            ))}
            {busy ? <p className="ai-chatbot__bubble is-bot">답변을 작성하는 중...</p> : null}
          </div>
          <form className="ai-chatbot__form" onSubmit={(event) => handleSubmit(event)}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="질문을 입력하세요"
              maxLength={800}
            />
            <button type="submit" disabled={busy || !input.trim()}>
              보내기
            </button>
          </form>
        </div>
      ) : null}
      <div className="ai-chatbot__fab-wrap">
        <button
          type="button"
          className="ai-chatbot__fab"
          aria-label={`${config.name} 열기 (Beta)`}
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next) trackSiteAnalytics("chatbot_open");
          }}
        >
          {config.icon_url ? <img src={config.icon_url} alt="" /> : <span aria-hidden>💬</span>}
        </button>
        <span className="ai-chatbot__fab-beta" aria-hidden>
          Beta
        </span>
      </div>
    </div>
  );
}
