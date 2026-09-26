const STOP_WORDS = new Set([
  "더보기",
  "찾아줘",
  "찾아봐",
  "보여줘",
  "알려줘",
  "해줘",
  "해주세요",
  "열어줘",
  "열어",
  "주세요",
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
  "있냐",
  "없나",
  "뭐야",
  "뭐임",
  "하는",
  "하는거",
  "음",
  "어",
  "아",
]);

/** 챗봇이 기본적으로 알아듣는 말. 외부 AI가 아니라 사이트 안내 봇의 단어입니다. */
const CHATBOT_WORDS = [
  "시즌패스",
  "골드상점",
  "도장이벤트",
  "스탬프이벤트",
  "게시판",
  "글쓰기",
  "글목록",
  "댓글",
  "신고",
  "제휴목록",
  "제휴리스트",
  "제휴",
  "목록",
  "리스트",
  "이벤트",
  "시즌",
  "패스",
  "도장",
  "스탬프",
  "골드",
  "상점",
  "코스튬",
  "보관함",
  "선물함",
  "선물",
  "쿠폰",
  "로그인",
  "학생증",
  "추천",
  "맛집",
  "밥집",
  "밥메뉴",
  "아침",
  "점심",
  "저녁",
  "메뉴",
  "카페",
  "놀거리",
  "핫플",
  "술집",
  "고기",
  "분식",
  "혜택",
  "할인",
  "출석",
  "퀘스트",
  "list",
];

export type ChatbotWordCount = {
  word: string;
  count: number;
};

export type ChatbotWordAnalytics = {
  words: ChatbotWordCount[];
  missed: ChatbotWordCount[];
};

function addWord(target: Set<string>, value: string) {
  const word = value.trim().toLowerCase();
  if (word.length < 2 || word.length > 24 || STOP_WORDS.has(word)) return;
  target.add(word);
}

function spokenPart(value: string) {
  return value
    .replace(/[^0-9a-zA-Z가-힣]/g, "")
    .replace(/(해주세요|찾아줘|찾아봐|보여줘|알려줘|열어줘|해줘|주세요)$/g, "")
    .replace(/(을|를|이|가|은|는|의|에서|에게|한테)$/g, "");
}

function parseChatbotPath(path: string) {
  const raw = String(path ?? "").trim();
  let question = raw;
  let missed = "";
  if (raw.startsWith("q:")) {
    const body = raw.slice(2);
    const split = body.split("|m:");
    question = (split[0] ?? "").trim();
    missed = (split[1] ?? "").trim();
  } else if (raw.startsWith("m:") || raw.startsWith("miss:")) {
    missed = raw.replace(/^(miss:|m:)/, "").trim();
    question = "";
  } else if (raw === "/" || raw === "") {
    question = "";
  }
  return { question, missed };
}

function matchLexicon(text: string, lexicon: string[]): string[] {
  const found = new Set<string>();
  const lower = text.toLowerCase();
  const spoken = [...new Set([...CHATBOT_WORDS, ...lexicon])]
    .filter((word) => word.trim().length >= 2)
    .sort((a, b) => b.length - a.length);
  const used = new Array(lower.length).fill(false);

  for (const word of spoken) {
    const needle = word.toLowerCase();
    let from = 0;
    while (from <= lower.length - needle.length) {
      const idx = lower.indexOf(needle, from);
      if (idx < 0) break;
      const overlap = used.slice(idx, idx + needle.length).some(Boolean);
      if (!overlap) {
        addWord(found, word);
        for (let i = idx; i < idx + needle.length; i += 1) used[i] = true;
      }
      from = idx + 1;
    }
  }

  return [...found];
}

/** 말한 문장에서 챗봇이 쓰는 단어만 고릅니다. */
export function tokenizeSpokenWords(raw: string, extraLexicon: string[] = []): string[] {
  const { question } = parseChatbotPath(raw);
  if (!question || question === "더보기") return [];

  const found = new Set(matchLexicon(question, extraLexicon));
  for (const quoted of question.matchAll(/[「『“"']([^」』”"']{2,24})[」』”"']/g)) {
    addWord(found, spokenPart(quoted[1] ?? ""));
  }
  return [...found];
}

export function tokenizeMissedWords(raw: string, extraLexicon: string[] = []): string[] {
  const { question, missed } = parseChatbotPath(raw);
  const found = new Set<string>();
  if (missed) {
    addWord(found, spokenPart(missed));
    for (const part of missed.split(/[\s,./!?~·「」『』“”"']+/).filter(Boolean)) {
      addWord(found, spokenPart(part));
    }
    return [...found];
  }
  if (!question || question === "더보기") return [];
  if (tokenizeSpokenWords(raw, extraLexicon).length > 0) return [];
  addWord(found, spokenPart(question));
  for (const part of question.split(/[\s,./!?~·「」『』“”"']+/).filter(Boolean)) {
    addWord(found, spokenPart(part));
  }
  return [...found];
}

function tally(paths: string[], pick: (path: string) => string[], limit: number) {
  const counts = new Map<string, number>();
  for (const path of paths) {
    for (const word of pick(path)) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "ko"))
    .slice(0, limit);
}

export function aggregateChatbotWords(
  paths: string[],
  extraLexicon: string[] = [],
  limit = 30,
): ChatbotWordCount[] {
  return tally(paths, (path) => tokenizeSpokenWords(path, extraLexicon), limit);
}

export function aggregateChatbotWordAnalytics(
  paths: string[],
  extraLexicon: string[] = [],
  limit = 30,
): ChatbotWordAnalytics {
  return {
    words: aggregateChatbotWords(paths, extraLexicon, limit),
    missed: tally(paths, (path) => tokenizeMissedWords(path, extraLexicon), limit),
  };
}
