const STOP_WORDS = new Set([
  "더보기",
  "찾아줘",
  "찾아봐",
  "보여줘",
  "알려줘",
  "해줘",
  "해주세요",
  "해주세요",
  "열어줘",
  "열어",
  "좀",
  "요",
  "은",
  "는",
  "이",
  "가",
  "을",
  "를",
  "에",
  "로",
  "으로",
  "하고",
  "그거",
  "이거",
  "저거",
  "있나",
  "있어",
  "없나",
  "뭐야",
  "뭐임",
]);

export type ChatbotWordCount = {
  word: string;
  count: number;
};

function normalizeQuestionPath(path: string) {
  const raw = String(path ?? "").trim();
  if (raw.startsWith("q:")) return raw.slice(2).trim();
  if (raw === "/" || raw === "") return "";
  return raw;
}

export function tokenizeChatbotQuestion(raw: string): string[] {
  const text = normalizeQuestionPath(raw);
  if (!text || text === "더보기") return [];

  const tokens = new Set<string>();
  for (const part of text.split(/[\s,./!?~·]+/).filter(Boolean)) {
    const compact = part.replace(/[^0-9a-zA-Z가-힣]/g, "").toLowerCase();
    if (compact.length >= 2 && compact.length <= 24 && !STOP_WORDS.has(compact)) {
      tokens.add(compact);
    }
  }

  const compactAll = text.replace(/\s+/g, "").toLowerCase();
  if (compactAll.length >= 2 && compactAll.length <= 18 && !STOP_WORDS.has(compactAll)) {
    tokens.add(compactAll);
  }

  return [...tokens];
}

export function aggregateChatbotWords(paths: string[], limit = 20): ChatbotWordCount[] {
  const counts = new Map<string, number>();
  for (const path of paths) {
    for (const word of tokenizeChatbotQuestion(path)) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "ko"))
    .slice(0, limit);
}
