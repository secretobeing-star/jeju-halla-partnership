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
]);

/** 말하면서 자주 나오는 안내 단어. 질문에 이 말이 들어가면 그대로 집계합니다. */
const SPOKEN_WORDS = [
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

function spokenTextFromPath(path: string) {
  const raw = String(path ?? "").trim();
  if (raw.startsWith("q:")) return raw.slice(2).trim();
  if (raw === "/" || raw === "") return "";
  return raw;
}

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

/** 말한 문장에서 실제로 나온 단어만 고릅니다. 질문 전체를 한 덩어리로 세지 않습니다. */
export function tokenizeSpokenWords(raw: string): string[] {
  const text = spokenTextFromPath(raw);
  if (!text || text === "더보기") return [];

  const found = new Set<string>();
  const lower = text.toLowerCase();
  const spoken = [...SPOKEN_WORDS].sort((a, b) => b.length - a.length);
  const used = new Array(lower.length).fill(false);

  for (const quoted of text.matchAll(/[「『“"']([^」』”"']{2,24})[」』”"']/g)) {
    addWord(found, spokenPart(quoted[1] ?? ""));
  }

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

  for (const part of text.split(/[\s,./!?~·「」『』“”"']+/).filter(Boolean)) {
    addWord(found, spokenPart(part));
  }

  return [...found];
}

export function aggregateChatbotWords(paths: string[], limit = 30): ChatbotWordCount[] {
  const counts = new Map<string, number>();
  for (const path of paths) {
    for (const word of tokenizeSpokenWords(path)) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "ko"))
    .slice(0, limit);
}
