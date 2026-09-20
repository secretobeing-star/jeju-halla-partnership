import { parsePartnerRegion } from "@/lib/partner-regions";

export const AI_CHATBOT_PROVIDERS = ["openai", "gemini"] as const;
export type AiChatbotProvider = (typeof AI_CHATBOT_PROVIDERS)[number];

export type AiChatbotLessonKind = "answer" | "recommend" | "search" | "events";

export type AiChatbotLesson = {
  id: string;
  phrases: string;
  kind: AiChatbotLessonKind;
  answer: string;
  reco: string;
};

export type AiChatbotSettings = {
  enabled: boolean;
  name: string;
  welcome_message: string;
  login_greeting: string;
  profile_bio: string;
  icon_url: string | null;
  provider: AiChatbotProvider;
  api_key: string;
  has_api_key: boolean;
  lessons: AiChatbotLesson[];
};

export type AiChatbotPublicConfig = {
  enabled: boolean;
  name: string;
  welcome_message: string;
  login_greeting: string;
  profile_bio: string;
  icon_url: string | null;
};

export type ChatbotCardOpenKind = "partner" | "season" | "map" | "site";

export type ChatbotPartnerCard = {
  id: string;
  name: string;
  category: string;
  region: string;
  benefit: string;
  address: string;
  image_url: string | null;
  openKind?: ChatbotCardOpenKind;
};

export type ChatbotIntent = {
  type: "partner_list" | "partner_search" | "meal_recommend";
  query?: string;
  offset: number;
  seed?: number;
  region?: string;
};

export type ChatbotReply = {
  text: string;
  choices?: string[];
  hasMore?: boolean;
  moreIntent?: ChatbotIntent;
  cards?: ChatbotPartnerCard[];
  taught?: boolean;
};

export type ChatbotLiveEventLine = {
  group: string;
  title: string;
  period: string | null;
  id: string;
  openKind: ChatbotCardOpenKind;
  image_url: string | null;
};

export type SitePartnerHint = {
  id?: string;
  name?: string;
  category?: string;
  region?: string;
  benefit?: string;
  address?: string;
  image_url?: string | null;
};

const CHOICE_PAGE = 6;
const CARD_PAGE = 4;

export function asAiChatbotLessonKind(value: unknown): AiChatbotLessonKind {
  if (value === "recommend" || value === "search" || value === "events") return value;
  return "answer";
}

export function asAiChatbotProvider(value: unknown): AiChatbotProvider {
  return value === "gemini" ? "gemini" : "openai";
}

export function parseChatbotLessons(raw: unknown): AiChatbotLesson[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 40).map((item, index) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      id: String(row.id ?? `lesson-${index}`).slice(0, 80),
      phrases: String(row.phrases ?? "").slice(0, 800),
      kind: asAiChatbotLessonKind(row.kind),
      answer: String(row.answer ?? "").slice(0, 800),
      reco: String(row.reco ?? "").slice(0, 40),
    };
  });
}

export function mapAiChatbotSettings(row: Record<string, unknown> | null): AiChatbotSettings {
  const apiKey = typeof row?.api_key === "string" ? row.api_key : "";
  return {
    enabled: row?.enabled === true,
    name: String(row?.name ?? "").trim() || "안내 봇",
    welcome_message:
      String(row?.welcome_message ?? "").trim() ||
      "안녕하세요. 제휴·혜택·이벤트에 대해 물어보세요.",
    login_greeting: String(row?.login_greeting ?? "").trim() || "{name}님 안녕하세요",
    profile_bio: String(row?.profile_bio ?? "").trim() || "제휴·혜택을 안내합니다.",
    icon_url: typeof row?.icon_url === "string" && row.icon_url.trim() ? row.icon_url.trim() : null,
    provider: asAiChatbotProvider(row?.provider),
    api_key: apiKey,
    has_api_key: Boolean(apiKey.trim()),
    lessons: parseChatbotLessons(row?.lessons),
  };
}

export function toPublicAiChatbotConfig(settings: AiChatbotSettings): AiChatbotPublicConfig | null {
  if (!settings.enabled) {
    return null;
  }
  return {
    enabled: true,
    name: settings.name,
    welcome_message: settings.welcome_message,
    login_greeting: settings.login_greeting,
    profile_bio: settings.profile_bio,
    icon_url: settings.icon_url,
  };
}

export const OPEN_SITE_PARTNER_EVENT = "halla-open-partner";
export const OPEN_SITE_MAP_EVENT = "halla-open-map-event";
export const OPEN_SITE_EVENT_DETAIL = "halla-open-site-event";

export function requestOpenSitePartner(partnerId: string) {
  if (typeof window === "undefined") return;
  const id = partnerId.trim();
  if (!id) return;
  window.dispatchEvent(new CustomEvent(OPEN_SITE_PARTNER_EVENT, { detail: { id } }));
}

export function requestOpenChatbotCard(card: ChatbotPartnerCard) {
  if (typeof window === "undefined") return;
  const kind = card.openKind ?? "partner";
  if (kind === "season") {
    window.dispatchEvent(new Event("site-season-pass-open"));
    return;
  }
  if (kind === "map") {
    const id = card.id.trim();
    if (!id) return;
    window.dispatchEvent(new CustomEvent(OPEN_SITE_MAP_EVENT, { detail: { id } }));
    return;
  }
  if (kind === "site") {
    const id = card.id.trim();
    if (!id) return;
    window.dispatchEvent(new CustomEvent(OPEN_SITE_EVENT_DETAIL, { detail: { id } }));
    return;
  }
  requestOpenSitePartner(card.id);
}

export function formatChatbotLoginGreeting(
  template: string,
  student: { name?: string | null; studentId?: string | null },
  fallback: string,
) {
  const name = student.name?.trim() || "";
  if (!name) return fallback;
  return (template.trim() || "{name}님 안녕하세요")
    .replaceAll("{name}", name)
    .replaceAll("{studentId}", student.studentId?.trim() || "");
}

export const DEFAULT_PUBLIC_CHATBOT_CONFIG: AiChatbotPublicConfig = {
  enabled: true,
  name: "안내 봇",
  welcome_message: "안녕하세요. 제휴·혜택·이벤트에 대해 물어보세요.",
  login_greeting: "{name}님 안녕하세요",
  profile_bio: "제휴·혜택을 안내합니다.",
  icon_url: null,
};

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function uniqueCategories(partners: SitePartnerHint[]) {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const partner of partners) {
    const category = String(partner.category ?? "").trim();
    if (!category || seen.has(category)) continue;
    seen.add(category);
    list.push(category);
  }
  return list;
}

function toCard(partner: SitePartnerHint): ChatbotPartnerCard {
  return {
    id: String(partner.id ?? partner.name ?? ""),
    name: String(partner.name ?? "").trim(),
    category: String(partner.category ?? "").trim(),
    region: String(partner.region ?? "").trim(),
    benefit: String(partner.benefit ?? "").replace(/\s+/g, " ").trim(),
    address: String(partner.address ?? "").trim(),
    image_url: typeof partner.image_url === "string" && partner.image_url.trim() ? partner.image_url.trim() : null,
  };
}

function compactText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export function isLiveEventsQuestion(question: string) {
  const compact = compactText(question);
  if (includesAny(compact, ["비밀번호", "패스워드", "password"])) return false;
  const howTo = includesAny(compact, [
    "어떻게",
    "어케",
    "사용법",
    "쓰는법",
    "하는법",
    "찍는법",
    "참여방법",
    "참여하냐",
    "경험치",
    "레벨업",
    "레벨올리",
  ]);
  if (
    includesAny(compact, [
      "현재진행",
      "지금진행",
      "진행중인이벤트",
      "진행중이벤트",
      "진행중패스",
      "진행중인패스",
      "진행중시즌",
      "지금이벤트",
      "현재이벤트",
      "요즘이벤트",
      "이번이벤트",
      "이번시즌",
      "하고있는이벤트",
      "하는이벤트",
      "하는중인이벤트",
      "열리는이벤트",
      "열리는패스",
      "열리고있는",
      "참여할이벤트",
      "참여가능한이벤트",
      "참여이벤트",
      "보상이벤트",
      "이벤트뭐있",
      "이벤트있어",
      "이벤트있어여",
      "이벤트있냐",
      "이벤트있나",
      "이벤트잇어",
      "이벤트잇나",
      "이벤트없냐",
      "이벤트알려",
      "이벤트보여",
      "이벤트열어",
      "이벤트창",
      "이벤트팝업",
      "이벤트목록",
      "이벤트리스트",
      "이벤트현황",
      "이벤트일정",
      "이벤트기간",
      "이벤트언제",
      "이벤트추천",
      "이벤트하즈아",
      "이밴트",
      "이벤뜨",
      "어떤이벤트",
      "무슨이벤트",
      "도장이벤트",
      "도장찍자",
      "도장찍을",
      "도장투어",
      "스탬프이벤트",
      "스탬프투어",
      "스탬프찍",
      "스템프",
      "지도이벤트",
      "완주이벤트",
      "시즌패스이름",
      "시즌패스기간",
      "시즌패스있어",
      "시즌패스있나",
      "시즌패스뭐",
      "시즌패스알려",
      "시즌패스목록",
      "시즌패스열어",
      "시즌패스보여",
      "시즌패스창",
      "시즌빠스",
      "시즌패쓰",
      "패스있어",
      "패스있나",
      "패스잇어",
      "패스진행",
      "패스기간",
      "패스이름",
      "패스뭐하",
      "패스알려",
      "패스열어",
      "패스보여",
      "패스창",
      "패스팝업",
      "시즌있어",
      "시즌있나",
      "시즌뭐",
      "시즌기간",
      "시즌이름",
      "지금패스",
      "현재패스",
      "현재시즌",
      "출석이벤트",
      "퀘스트이벤트",
    ])
  ) {
    return !howTo;
  }
  if (
    !howTo &&
    includesAny(compact, ["이벤트", "시즌패스", "도장이벤트", "스탬프이벤트", "지도이벤트"])
  ) {
    return true;
  }
  if (
    !howTo &&
    includesAny(compact, ["도장", "스탬프", "시즌패스", "패스"]) &&
    includesAny(compact, ["열어", "보여", "알려", "뭐있", "있어", "있냐", "목록", "추천", "참여", "하자", "찍자"])
  ) {
    return true;
  }
  const aboutEvent = includesAny(compact, ["이벤트", "시즌패스", "시즌", "패스", "도장", "스탬프"]);
  const askingNow = includesAny(compact, [
    "진행",
    "현재",
    "지금",
    "요즘",
    "이번",
    "언제",
    "기간",
    "일정",
    "있어",
    "있나",
    "잇어",
    "없나",
    "뭐야",
    "뭐임",
    "알려",
    "보여",
    "열어",
    "추천",
    "목록",
  ]);
  return aboutEvent && askingNow && !howTo;
}

export function formatLiveEventsReply(lines: ChatbotLiveEventLine[]): ChatbotReply {
  if (lines.length === 0) {
    return { text: "지금 진행 중인 이벤트가 없습니다.", taught: true };
  }
  const cards: ChatbotPartnerCard[] = lines.map((item) => ({
    id: item.id,
    name: item.title,
    category: item.group,
    region: item.period?.trim() ? `기간: ${item.period}` : "기간: 상시",
    benefit: "눌러서 자세히 보기",
    address: "",
    image_url: item.image_url,
    openKind: item.openKind,
  }));
  return {
    text: "지금 진행 중인 이벤트입니다. 카드를 누르면 팝업으로 볼 수 있습니다.",
    cards,
    taught: true,
  };
}

export function chatbotNeedsLiveEvents(
  question: string,
  lessons: AiChatbotLesson[],
  intent?: ChatbotIntent | null,
) {
  if (intent) return false;
  if (isLiveEventsQuestion(question)) return true;
  return lessons.some((lesson) => lesson.kind === "events");
}

function matchingTopicTerms(query: string) {
  const compactQuery = compactText(query);
  const terms = new Set<string>();
  if (compactQuery) terms.add(compactQuery);

  const groups = [
    ["중국집", "중식", "중국요리", "짜장", "짜장면", "짬뽕", "탕수육", "마라탕", "마라샹궈", "양장피", "깐풍기", "유산슬", "볶음밥", "중국", "중식당", "중식집", "마라"],
    ["빵", "빵집", "베이커리", "bakery", "케이크", "케익", "크로와상", "식빵", "도넛", "도너츠", "베이글", "페스츄리", "파리바게", "던킨", "소금빵", "크로플"],
    ["치킨", "후라이드", "양념치킨", "닭", "닭강정", "치맥", "bbq", "bhc", "교촌", "네네", "뿌링클"],
    ["피자", "pizza", "피자헛", "도미노", "파파존스", "피맥"],
    ["일식", "초밥", "스시", "라멘", "우동", "돈까스", "돈카츠", "회", "사시미", "덮밥", "규동", "텐동"],
    ["한식", "국밥", "찌개", "백반", "한정식", "김치찌개", "된장", "비빔밥", "불고기", "제육"],
    ["카페", "커피", "디저트", "라떼", "음료", "아메리카노", "스타벅스", "이디야", "베이커리카페", "디저트카페", "카공", "감성카페", "스터디카페"],
    ["술집", "요리주점", "호프", "바", "beer", "포차", "맥주", "소주", "이자카야", "펍", "pub", "소맥", "하이볼", "칵테일"],
    ["고기", "삼겹", "갈비", "한우", "구이", "고기집", "삼겹살", "소고기", "돼지고기", "목살", "곱창", "막창"],
    ["분식", "떡볶이", "김밥", "라면", "튀김", "순대", "오뎅", "어묵", "라볶이", "떡순이", "김볶"],
    ["헤어", "미용", "뷰티", "컷", "파마", "네일", "피부"],
    ["테마파크", "놀이공원", "워터파크", "아쿠아리움", "수족관", "동물원", "키즈카페", "체험", "핫플", "방탈출", "보드게임"],
  ];

  for (const group of groups) {
    const compactGroup = group.map((item) => compactText(item)).filter(Boolean);
    const hit = compactGroup.some(
      (item) => compactQuery === item || (item.length >= 2 && compactQuery.includes(item)) || (compactQuery.length >= 1 && item.includes(compactQuery)),
    );
    if (hit) {
      for (const item of compactGroup) terms.add(item);
    }
  }

  return [...terms];
}

function scorePartner(partner: SitePartnerHint, query: string) {
  const name = String(partner.name ?? "");
  const category = String(partner.category ?? "");
  const region = String(partner.region ?? "");
  const benefit = String(partner.benefit ?? "");
  const address = String(partner.address ?? "");
  const hay = compactText(`${name} ${category} ${region} ${benefit} ${address}`);
  const compactName = compactText(name);
  let score = 0;

  for (const term of matchingTopicTerms(query)) {
    if (!term || !hay.includes(term)) continue;
    if (compactName.includes(term)) score += 18 + term.length;
    else if (compactText(category).includes(term)) score += 10;
    else if (compactText(benefit).includes(term)) score += 14 + term.length;
    else score += 6 + term.length;
  }

  for (const token of query.split(/\s+/).filter((item) => item.length >= 1)) {
    const compactToken = compactText(token);
    if (compactName.includes(compactToken)) score += 12 + token.length;
    if (compactText(category).includes(compactToken)) score += 8;
    if (compactText(region).includes(compactToken) || compactText(address).includes(compactToken)) score += 6;
  }
  return score;
}

const INTENT_PHRASES = [
  "가고싶습니다",
  "가고싶어요",
  "가고싶은데요",
  "가고싶은데",
  "가고싶다",
  "가고싶어여",
  "가고싶어",
  "가고싶음",
  "가고파",
  "가고싶은",
  "가보고싶어",
  "가보고싶다",
  "가볼래",
  "가볼까",
  "가보자",
  "가보고싶",
  "데려가줘",
  "데려가",
  "먹고싶습니다",
  "먹고싶어요",
  "먹고싶은데",
  "먹고싶다",
  "먹고싶어여",
  "먹고싶어",
  "먹고싶음",
  "먹고파",
  "먹을래",
  "먹을까",
  "먹을거",
  "먹고싶",
  "찾아주세요",
  "찾아줄래",
  "찾아주라",
  "찾아줘",
  "찾아봐",
  "찾아바",
  "알려주세요",
  "알려줄래",
  "알려줘",
  "알려바",
  "검색해줘",
  "검색해봐",
  "검색",
  "추천해주세요",
  "추천해줄래",
  "추천해줘",
  "추천해봐",
  "추천좀",
  "추천",
  "어디있어요",
  "어디있어",
  "추천점요",
  "추천점",
  "추천요",
  "추천해주세여",
  "추천해주십쇼",
  "맛집추",
  "어디있음",
  "어디임",
  "어디야",
  "어딧어",
  "어딧음",
  "위치알려",
  "주소알려",
  "핫플알려",
  "가자",
  "갈래",
  "갈까",
  "가고싶",
  "가즈아",
];

function stripIntentPhrases(question: string) {
  let compact = compactText(question);
  const phrases = [...INTENT_PHRASES].sort((a, b) => compactText(b).length - compactText(a).length);
  for (const phrase of phrases) {
    compact = compact.split(compactText(phrase)).join("");
  }
  return compact
    .replace(/제휴(업체|처|목록)?/g, "")
    .replace(/(을|를|이|가|은|는|에|으로|로)+$/g, "")
    .trim();
}

function mentionedPartners(question: string, partners: SitePartnerHint[]) {
  const compactQuestion = compactText(question);
  return partners
    .filter((partner) => {
      const name = compactText(String(partner.name ?? ""));
      return name.length >= 2 && compactQuestion.includes(name);
    })
    .sort(
      (a, b) => compactText(String(b.name ?? "")).length - compactText(String(a.name ?? "")).length,
    );
}

function mentionedCategory(question: string, categories: string[]) {
  const compactQuestion = compactText(question);
  const leftover = stripIntentPhrases(question);
  const ranked = categories
    .map((category) => {
      const compactCategory = compactText(category);
      const parts = category
        .split(/[/·,]/)
        .map((part) => compactText(part))
        .filter((part) => part.length >= 2);
      let score = 0;
      if (compactCategory.length >= 2 && compactQuestion.includes(compactCategory)) score += 20;
      if (leftover.length >= 2 && (compactCategory === leftover || compactCategory.includes(leftover))) {
        score += 12;
      }
      if (parts.some((part) => leftover === part || compactQuestion.includes(part))) score += 10;
      return { category, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.category ?? "";
}

type RecoKey =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "rice"
  | "korean"
  | "chinese"
  | "japanese"
  | "snack"
  | "meat"
  | "chicken"
  | "pizza"
  | "noodles"
  | "seafood"
  | "alcohol"
  | "hangout";

const RECO_LABEL: Record<RecoKey, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  rice: "밥메뉴",
  korean: "한식",
  chinese: "중식",
  japanese: "일식",
  snack: "분식",
  meat: "고기",
  chicken: "치킨",
  pizza: "피자",
  noodles: "면요리",
  seafood: "해물",
  alcohol: "술집",
  hangout: "놀러갈 곳 (테마파크)",
};

export const CHATBOT_RECO_OPTIONS = (
  Object.entries(RECO_LABEL) as Array<[RecoKey, string]>
).map(([value, label]) => ({ value, label }));

const RECO_HINTS: Record<RecoKey, string[]> = {
  breakfast: ["아침", "브런치", "모닝", "백반", "국밥", "김밥", "토스트", "샌드위치", "죽"],
  lunch: ["점심", "백반", "국밥", "김밥", "분식", "도시락", "돈까스", "덮밥", "면", "밥", "중식"],
  dinner: ["저녁", "야식", "고기", "삼겹", "갈비", "치킨", "회", "찌개", "구이", "술"],
  rice: ["밥", "백반", "국밥", "덮밥", "정식", "식사", "밥집", "한식"],
  korean: ["한식", "찌개", "국밥", "백반", "갈비", "삼겹", "김치", "된장", "비빔밥", "불고기"],
  chinese: ["중식", "중국", "짜장", "짬뽕", "탕수육", "마라", "양장피", "깐풍"],
  japanese: ["일식", "초밥", "스시", "라멘", "우동", "돈까스", "돈카츠", "회", "사시미"],
  snack: ["분식", "떡볶이", "김밥", "라면", "튀김", "순대", "오뎅", "어묵", "라볶이"],
  meat: ["고기", "삼겹", "갈비", "한우", "구이", "고기집", "목살", "소고기"],
  chicken: ["치킨", "닭", "후라이드", "닭강정", "치맥"],
  pizza: ["피자", "pizza", "피맥"],
  noodles: ["면", "국수", "우동", "라멘", "칼국수", "냉면", "파스타", "스파게티", "쌀국수"],
  seafood: ["해물", "회", "생선", "문어", "새우", "게", "조개", "횟집"],
  alcohol: ["주점", "호프", "포차", "바", "술", "안주", "맥주", "소주", "이자카야", "펍", "소맥", "하이볼"],
  hangout: [
    "테마파크",
    "놀이공원",
    "워터파크",
    "아쿠아리움",
    "수족관",
    "동물원",
    "키즈카페",
    "체험",
    "관광",
    "공원",
    "박물관",
    "전시",
    "랜드",
    "스파",
    "온천",
    "생활",
    "노래방",
    "코인노래",
    "당구",
    "볼링",
    "피시",
    "pc",
    "찜질",
    "영화",
    "오락",
    "게임",
    "놀이",
    "방탈출",
    "만화카페",
    "보드게임",
    "클라이밍",
    "스크린",
    "핫플",
  ],
};

const MENU_CHOICES = [
  "아침 메뉴 추천",
  "점심 메뉴 추천",
  "저녁 메뉴 추천",
  "밥메뉴 추천",
  "한식 추천",
  "중식 추천",
  "일식 추천",
  "분식 추천",
  "고기 추천",
  "치킨 추천",
  "면요리 추천",
  "해물 추천",
  "술집 추천",
  "놀러갈 곳 추천",
];

const THEME_PARK_HINTS = [
  "테마파크",
  "놀이공원",
  "워터파크",
  "아쿠아리움",
  "수족관",
  "동물원",
  "키즈카페",
  "랜드",
  "파크",
  "체험",
  "관광",
];
const LIFESTYLE_BLOCK_FOR_FOOD = ["생활", "뷰티", "헤어", "미용", "의료", "병원", "약국", "기타"];
const CAFE_HINTS = ["카페", "커피", "디저트", "베이커리", "빵집", "브런치카페"];

function partnerHay(partner: SitePartnerHint) {
  return compactText(`${partner.name ?? ""} ${partner.category ?? ""} ${partner.benefit ?? ""}`);
}

function isCafeOrLifestyle(partner: SitePartnerHint) {
  const category = compactText(String(partner.category ?? ""));
  const hay = partnerHay(partner);
  return (
    CAFE_HINTS.some((item) => category.includes(item) || hay.includes(item)) ||
    LIFESTYLE_BLOCK_FOR_FOOD.some((item) => category.includes(item))
  );
}

function isRestaurantPartner(partner: SitePartnerHint) {
  if (isCafeOrLifestyle(partner)) return false;
  const category = compactText(String(partner.category ?? ""));
  return ["음식", "주점", "바", "식당", "맛집"].some((item) => category.includes(item) || partnerHay(partner).includes(item));
}

function isHangoutPartner(partner: SitePartnerHint) {
  const category = compactText(String(partner.category ?? ""));
  const nameHay = compactText(`${partner.name ?? ""} ${partner.benefit ?? ""}`);
  if (["병원", "약국", "의원", "치과", "한의"].some((item) => nameHay.includes(item))) return false;
  if (["음식", "주점", "식당"].some((item) => category.includes(item))) return false;
  if (CAFE_HINTS.some((item) => category.includes(item))) return false;
  if (category.includes("생활") || category.includes("기타")) return true;
  return RECO_HINTS.hangout.some((item) => nameHay.includes(item) || category.includes(item));
}

function newShuffleSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0 || 1;
}

function shuffleWithSeed<T>(items: T[], seed: number) {
  const copy = [...items];
  let state = seed >>> 0 || 1;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swap = state % (index + 1);
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy;
}

function recoScore(partner: SitePartnerHint, key: RecoKey) {
  if (key === "hangout") {
    if (!isHangoutPartner(partner)) return 0;
    const hay = partnerHay(partner);
    let score = 3;
    for (const hint of THEME_PARK_HINTS) {
      if (hay.includes(hint)) score += 24;
    }
    for (const hint of RECO_HINTS.hangout) {
      if (hay.includes(hint)) score += 6;
    }
    return score;
  }
  if (!isRestaurantPartner(partner)) return 0;
  const hay = partnerHay(partner);
  const category = compactText(String(partner.category ?? ""));
  if (key === "breakfast" && (category.includes("주점") || category.includes("바"))) return 0;

  let score = key === "rice" || key === "lunch" || key === "dinner" || key === "breakfast" ? 3 : 0;
  for (const hint of RECO_HINTS[key]) {
    if (hay.includes(hint)) score += 10;
  }
  return score;
}

function isHangoutQuestion(compact: string) {
  if (
    includesAny(compact, [
      "테마파크",
      "놀이공원",
      "워터파크",
      "아쿠아리움",
      "놀러갈곳",
      "놀려갈곳",
      "놀러갈데",
      "놀곳",
      "놀데",
      "놀만한곳",
      "놀만한데",
      "놀려갈",
      "놀러갈",
      "놀러가",
      "놀려가",
      "놀러와",
      "놀러옴",
      "데이트코스",
      "데이트할",
      "나들이",
      "소풍",
      "방탈출",
      "노래방",
      "볼링",
      "당구",
      "찜질방",
      "pc방",
      "피시방",
      "생활시설",
      "핫플",
      "핫플레이스",
      "인생샷",
      "불금",
      "불토",
      "놀금",
      "놀토",
      "코인노래",
      "보드게임",
      "클라이밍",
    ])
  ) {
    return true;
  }
  const foodAsk = includesAny(compact, [
    "메뉴",
    "뭐먹",
    "머먹",
    "밥집",
    "한식",
    "중식",
    "일식",
    "분식",
    "식사",
    "맛집",
    "존맛",
    "배고",
    "먹을",
    "먹으",
    "먹태",
    "치킨",
    "피자",
    "술집",
    "혼밥",
    "jmt",
  ]);
  if (foodAsk && includesAny(compact, ["아침", "점심", "저녁", "야식"])) {
    return false;
  }
  if (
    includesAny(compact, [
      "놀러",
      "놀려",
      "데이트",
      "놀곳",
      "놀기",
      "놀자",
      "갈곳",
      "갈데",
      "생활시설",
      "놀만한",
      "심심해",
      "심심함",
      "심심",
      "뭐하지",
      "뭐하냐",
      "뭐하까",
      "시간때우",
      "시간떼우",
      "놀고싶",
      "나가놀",
      "나가자",
      "어디가지",
      "어디갈까",
      "갈곳없",
      "할거없",
      "뭐하징",
      "머하지",
      "머하냐",
      "심심하당",
      "심심한디",
      "심하심",
      "힐링",
      "드라이브",
    ]) &&
    !foodAsk
  ) {
    return true;
  }
  const weekend = includesAny(compact, ["주말", "토요일", "일요일", "연휴", "휴일", "공휴일", "불금", "불토", "놀금", "놀토"]);
  const outing = includesAny(compact, ["놀", "데이트", "어디가", "갈건", "갈까", "나가", "외출", "추천", "뭐하", "머하", "핫플"]);
  return weekend && outing && !foodAsk;
}

function kstHour(now = new Date()) {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now).find((part) => part.type === "hour")?.value;
  return Number(hour);
}

function mealKeyByKstTime(now = new Date()): RecoKey {
  const hour = kstHour(now);
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  return "dinner";
}

type RegionHit = {
  needle: string;
  label: string;
};

function regionAliasTokens(value: string) {
  const compact = compactText(value);
  if (compact.length < 2) return [];
  const tokens = [compact];
  if (compact.endsWith("시") && compact.length > 2) tokens.push(compact.slice(0, -1));
  const withoutNumberDong = compact.replace(/[0-9]+동$/, "");
  if (withoutNumberDong.length >= 2 && withoutNumberDong !== compact) tokens.push(withoutNumberDong);
  const withoutSuffix = compact.replace(/[동읍면]$/, "");
  if (withoutSuffix.length >= 2 && withoutSuffix !== compact) tokens.push(withoutSuffix);
  return tokens;
}

function detectMentionedRegion(question: string, partners: SitePartnerHint[]): RegionHit | null {
  const compactQuestion = compactText(question);
  if (!compactQuestion) return null;
  const ranked: RegionHit[] = [];
  const seen = new Set<string>();

  const add = (needle: string, label: string) => {
    if (needle.length < 2 || seen.has(`${needle}:${label}`)) return;
    seen.add(`${needle}:${label}`);
    ranked.push({ needle, label });
  };

  for (const partner of partners) {
    const parsed = parsePartnerRegion(String(partner.region ?? ""));
    if (parsed.city) {
      for (const token of regionAliasTokens(parsed.city)) add(token, parsed.city);
    }
    if (parsed.area && parsed.area !== "전체") {
      for (const token of regionAliasTokens(parsed.area)) add(token, parsed.area);
    }
  }

  add("제주시", "제주시");
  add("서귀포시", "서귀포시");
  add("서귀포", "서귀포시");
  add("시내", "제주시");

  ranked.sort((left, right) => right.needle.length - left.needle.length);
  return ranked.find((item) => compactQuestion.includes(item.needle)) ?? null;
}

function partnerMatchesRegion(partner: SitePartnerHint, region: RegionHit) {
  const parsed = parsePartnerRegion(String(partner.region ?? ""));
  const city = compactText(parsed.city);
  const area = compactText(parsed.area ?? "");
  const hay = compactText(`${partner.region ?? ""} ${partner.address ?? ""}`);
  if (city === region.needle || city.includes(region.needle) || (city.length >= 2 && region.needle.includes(city))) {
    return true;
  }
  if (area && (area === region.needle || area.includes(region.needle) || (area.length >= 2 && region.needle.includes(area)))) {
    return true;
  }
  if (region.needle === "시내" && city.includes("제주")) return true;
  return hay.includes(region.needle);
}

function filterPartnersByRegion(partners: SitePartnerHint[], region: RegionHit | null) {
  if (!region) return partners;
  return partners.filter((partner) => partnerMatchesRegion(partner, region));
}

function isCafeQuestion(compact: string) {
  return includesAny(compact, [
    "카페",
    "커피",
    "아메리카노",
    "라떼",
    "디저트카페",
    "커피숍",
    "커피샵",
    "cafe",
    "카공",
    "감성카페",
    "스터디카페",
    "디저트집",
    "빵집추천",
    "소금빵",
  ]);
}

function detectRecoKey(question: string): RecoKey | "choices" | null {
  const compact = compactText(question);
  if (isHangoutQuestion(compact)) return "hangout";
  if (isCafeQuestion(compact)) return null;
  if (includesAny(compact, ["밥메뉴", "밥집", "식사메뉴", "밥추천", "밥뭐", "밥먹을", "백반", "혼밥"])) return "rice";
  if (includesAny(compact, ["한식", "국밥", "찌개", "김치찌개", "된장찌개", "비빔밥", "제육"])) return "korean";
  if (includesAny(compact, ["중식", "중국집", "짜장", "짬뽕", "탕수육", "마라탕", "중국요리", "마라샹궈"])) return "chinese";
  if (includesAny(compact, ["일식", "초밥", "스시", "라멘", "우동", "돈까스", "돈카츠"])) return "japanese";
  if (includesAny(compact, ["분식", "떡볶이", "김밥", "라면", "순대", "라볶이", "떡순이", "김볶"])) return "snack";
  if (
    includesAny(compact, ["고기집", "고기메뉴", "삼겹", "갈비", "소고기", "돼지고기", "목살", "곱창", "막창"]) ||
    (compact.includes("고기") && includesAny(compact, ["추천", "메뉴", "먹", "집"]))
  ) {
    return "meat";
  }
  if (includesAny(compact, ["치킨", "치맥", "닭강정", "후라이드", "양념치킨", "뿌링클"])) return "chicken";
  if (includesAny(compact, ["피자", "pizza", "피맥"])) return "pizza";
  if (includesAny(compact, ["면요리", "국수", "칼국수", "냉면", "파스타", "스파게티", "쌀국수"])) return "noodles";
  if (includesAny(compact, ["해물", "횟집", "회먹", "조개", "새우"])) return "seafood";
  if (includesAny(compact, ["술집", "안주", "호프", "포차", "맥주", "소주", "한잔", "이자카야", "펍", "소맥", "혼술", "이차", "2차", "술약속", "하이볼"])) {
    return "alcohol";
  }
  if (includesAny(compact, ["아침", "브런치", "모닝", "아메추", "아침메뉴", "아침뭐", "브메추"])) return "breakfast";
  if (includesAny(compact, ["점심", "점메추", "점심메뉴", "점심뭐", "낮밥"])) return "lunch";
  if (includesAny(compact, ["저녁", "야식", "회식", "저메추", "야메추", "저녁메뉴", "저녁뭐"])) return "dinner";
  if (
    includesAny(compact, [
      "메뉴추천",
      "맛집추천",
      "뭐먹지",
      "뭐먹을까",
      "뭐먹을",
      "뭐먹징",
      "머먹지",
      "머먹을",
      "배고파",
      "배고프",
      "배고픔",
      "배고프당",
      "배고픈데",
      "식사추천",
      "밥추천",
      "추천메뉴",
      "맛집알려",
      "맛집뭐",
      "밥먹자",
      "밥먹으러",
      "존맛집",
      "존맛탱",
      "맛도리",
      "개맛집",
      "핵맛",
      "jmt",
      "인생맛집",
      "가성비맛집",
      "가심비",
      "줄서는집",
      "웨이팅맛집",
      "맛있는거",
      "먹을거추천",
      "먹태",
      "점저",
    ])
  ) {
    return "choices";
  }
  if (compact.includes("메뉴") && includesAny(compact, ["추천", "뭐", "먹"])) return "choices";
  return null;
}

function asRecoKey(value?: string | null): RecoKey | null {
  if (!value) return null;
  if (
    (
      [
        "breakfast",
        "lunch",
        "dinner",
        "rice",
        "korean",
        "chinese",
        "japanese",
        "snack",
        "meat",
        "chicken",
        "pizza",
        "noodles",
        "seafood",
        "alcohol",
        "hangout",
      ] as const
    ).includes(value as RecoKey)
  ) {
    return value as RecoKey;
  }
  const detected = detectRecoKey(value);
  return detected && detected !== "choices" ? detected : null;
}

function isRecommendQuestion(question: string) {
  return detectRecoKey(question) !== null;
}

function recommendChoices(offset: number): ChatbotReply {
  const slice = MENU_CHOICES.slice(offset, offset + CHOICE_PAGE);
  const nextOffset = offset + CHOICE_PAGE;
  return {
    text: offset === 0 ? "메뉴·놀 곳 분류입니다. 골라 주세요. 목록은 랜덤으로 보여 드립니다." : "다른 분류입니다.",
    choices: slice,
    hasMore: nextOffset < MENU_CHOICES.length,
    moreIntent:
      nextOffset < MENU_CHOICES.length
        ? { type: "meal_recommend", query: "choice-list", offset: nextOffset }
        : undefined,
  };
}

function recommendCards(
  partners: SitePartnerHint[],
  key: RecoKey,
  offset: number,
  seed?: number,
  fromClock = false,
  region: RegionHit | null = null,
): ChatbotReply {
  const label = RECO_LABEL[key];
  const scoped = filterPartnersByRegion(partners, region);
  const where = region ? `${region.label} ` : "";
  const shuffleSeed = seed && seed > 0 ? seed : newShuffleSeed();
  const matched = scoped
    .map((partner) => ({ partner, score: recoScore(partner, key) }))
    .filter((item) => item.score > 0 && String(item.partner.name ?? "").trim());

  const fallback =
    key === "hangout"
      ? scoped.filter(isHangoutPartner)
      : scoped.filter(isRestaurantPartner);

  const pool = matched.length > 0 ? matched : fallback.map((partner) => ({ partner, score: 1 }));
  const ranked = shuffleWithSeed(pool, shuffleSeed);

  const cards = ranked.map((item) => toCard(item.partner));
  const foundText =
    key === "hangout"
      ? `${where}놀러갈 테마파크·생활시설을 랜덤으로 골랐어요. 카드를 누르면 자세히 볼 수 있습니다.`
      : fromClock
        ? `지금 ${label} 시간이라 ${where}${label} 제휴를 랜덤으로 골랐어요. 카드를 누르면 자세히 볼 수 있습니다.`
        : `${where}${label} 제휴를 랜덤으로 골랐어요. 카드를 누르면 자세히 볼 수 있습니다.`;

  return paginateCards(
    cards,
    offset,
    { type: "meal_recommend", query: key, offset, seed: shuffleSeed, region: region?.needle },
    key === "hangout"
      ? `${where}놀러갈 테마파크·생활시설 제휴가 없습니다.`
      : `${where}${label}으로 추천할 제휴가 없습니다.`,
    foundText,
  );
}

function randomRegionCards(
  partners: SitePartnerHint[],
  region: RegionHit,
  offset: number,
  seed?: number,
): ChatbotReply {
  const scoped = filterPartnersByRegion(partners, region).filter((partner) => String(partner.name ?? "").trim());
  const shuffleSeed = seed && seed > 0 ? seed : newShuffleSeed();
  const cards = shuffleWithSeed(scoped, shuffleSeed).map(toCard);
  return paginateCards(
    cards,
    offset,
    { type: "partner_search", query: region.needle, offset, seed: shuffleSeed, region: region.needle },
    `${region.label} 제휴가 없습니다.`,
    `${region.label} 제휴를 랜덤으로 골랐어요. 카드를 누르면 자세히 볼 수 있습니다.`,
  );
}

function paginateCards(
  cards: ChatbotPartnerCard[],
  offset: number,
  intent: ChatbotIntent,
  emptyText: string,
  foundText: string,
): ChatbotReply {
  const slice = cards.slice(offset, offset + CARD_PAGE);
  const nextOffset = offset + CARD_PAGE;
  if (slice.length === 0) {
    return { text: emptyText };
  }
  return {
    text: foundText,
    cards: slice,
    hasMore: nextOffset < cards.length,
    moreIntent: nextOffset < cards.length ? { ...intent, offset: nextOffset } : undefined,
  };
}

function categoryChoices(partners: SitePartnerHint[], offset: number): ChatbotReply {
  const categories = uniqueCategories(partners);
  const slice = categories.slice(offset, offset + CHOICE_PAGE);
  const nextOffset = offset + CHOICE_PAGE;
  if (slice.length === 0) {
    return { text: "등록된 제휴 카테고리가 없습니다." };
  }
  return {
    text: offset === 0 ? "제휴 목록입니다. 보고 싶은 항목을 골라 주세요." : "다른 제휴 분류입니다.",
    choices: slice,
    hasMore: nextOffset < categories.length,
    moreIntent:
      nextOffset < categories.length ? { type: "partner_list", offset: nextOffset } : undefined,
  };
}

function cardsForCategory(partners: SitePartnerHint[], category: string, offset: number): ChatbotReply {
  const cards = partners
    .filter((partner) => String(partner.category ?? "").trim() === category)
    .map(toCard)
    .filter((item) => item.name);
  return paginateCards(
    cards,
    offset,
    { type: "partner_search", query: category, offset },
    `${category} 제휴가 없습니다.`,
    `${category} 제휴입니다.`,
  );
}

function searchCards(partners: SitePartnerHint[], query: string, offset: number): ChatbotReply {
  const cards = partners
    .map((partner) => ({ partner, score: scorePartner(partner, query) }))
    .filter((item) => item.score > 0 && String(item.partner.name ?? "").trim())
    .sort((a, b) => b.score - a.score)
    .map((item) => toCard(item.partner));
  return paginateCards(
    cards,
    offset,
    { type: "partner_search", query, offset },
    `"${query}" 제휴를 찾지 못했습니다. 「제휴 목록이 뭐있어?」로 분류를 볼 수 있어요.`,
    `"${query}" 제휴 정보입니다.`,
  );
}

function extractSearchQuery(question: string) {
  return stripIntentPhrases(question);
}

function isListQuestion(question: string) {
  const compact = compactText(question);
  return includesAny(compact, [
    "제휴목록",
    "제휴리스트",
    "제휴뭐있",
    "제휴뭐야",
    "제휴어떤",
    "제휴전체",
    "제휴다보",
    "제휴처뭐있",
    "제휴처목록",
    "제휴업체목록",
    "가맹점목록",
    "파트너목록",
    "분류뭐있",
  ]);
}

function siteGuideReply(question: string): ChatbotReply | null {
  const compact = compactText(question);
  if (
    includesAny(compact, [
      "로그인",
      "학번",
      "학생증",
      "인증",
      "회원가입",
      "가입",
      "비밀번호",
      "비번",
      "로그아웃",
    ])
  ) {
    return {
      text: "상단에서 학번으로 로그인할 수 있습니다. 학생 인증을 먼저 신청한 뒤, 승인되면 학번으로 들어와 주세요.",
    };
  }
  if (
    includesAny(compact, [
      "시즌패스",
      "퀘스트",
      "출석",
      "경험치",
      "레벨보상",
      "패스어떻게",
      "패스사용",
      "패스쓰는",
    ])
  ) {
    return {
      text: "시즌패스는 로그인 후 메뉴에서 열 수 있습니다. 제휴 방문·출석으로 경험치와 골드를 모으고, 레벨 보상을 받을 수 있습니다. 지금 열린 패스 이름·기간은 「현재 진행중인 이벤트」로 물어보세요.",
    };
  }
  if (includesAny(compact, ["선물함", "받은선물", "선물확인", "쿠폰함"])) {
    return {
      text: "로그인 후 선물함에서 받은 쿠폰·코스튬을 확인할 수 있습니다.",
    };
  }
  if (includesAny(compact, ["골드", "상점", "코스튬", "구입", "구매", "골드샵", "골드상점", "옷입"])) {
    return {
      text: "골드상점은 로그인 후 상점 메뉴에서 이용할 수 있습니다. 모은 골드로 패스·코스튬·쿠폰을 살 수 있습니다.",
    };
  }
  if (includesAny(compact, ["도장", "스탬프", "지도이벤트", "완주", "찍는법", "도장찍"])) {
    return {
      text: "제휴 탭 지도에서 이벤트에 참여할 수 있습니다. 지정된 제휴처 근처에서 도장을 찍으면 보상 기회가 있습니다.",
    };
  }
  if (includesAny(compact, ["혜택", "할인", "쿠폰어디", "제휴혜택", "뭐가할인"])) {
    return {
      text: "제휴 혜택은 업체 카드에서 확인할 수 있습니다. 업체 이름이나 「제휴 목록이 뭐있어?」로 물어보세요.",
    };
  }
  if (includesAny(compact, ["공지", "알림", "푸시", "공지사항"])) {
    return {
      text: "사이트 상단 공지와 알림에서 확인할 수 있습니다.",
    };
  }
  if (
    includesAny(compact, [
      "안녕",
      "안녕하세여",
      "안녕하세용",
      "하이루",
      "ㅎㅇㅎㅇ",
      "하이",
      "헬로",
      "hello",
      "hi",
      "도움",
      "헬프",
      "help",
      "뭐해",
      "뭐할수",
      "사용법",
      "어떻게써",
      "챗봇",
      "봇아",
    ])
  ) {
    return {
      text: "제휴 업체, 혜택, 시즌패스, 골드상점, 도장 이벤트, 로그인을 안내합니다. 「밥메뉴 추천」, 「놀러갈 곳」, 「현재 진행중인 이벤트」처럼 물어보세요.",
    };
  }
  return null;
}

function applyChatbotLessons(
  question: string,
  partners: SitePartnerHint[],
  lessons: AiChatbotLesson[],
  liveEvents: ChatbotLiveEventLine[] = [],
): ChatbotReply | null {
  const compact = compactText(question);
  if (!compact) return null;

  const ranked = lessons
    .map((lesson) => {
      const phrases = lesson.phrases
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter((item) => item.length >= 2)
        .sort((a, b) => b.length - a.length);
      const hit = phrases.find((phrase) => compact.includes(compactText(phrase)));
      return hit ? { lesson, length: compactText(hit).length } : null;
    })
    .filter((item): item is { lesson: AiChatbotLesson; length: number } => Boolean(item))
    .sort((a, b) => b.length - a.length);

  const best = ranked[0]?.lesson;
  if (!best) return null;

  if (best.kind === "events") {
    return formatLiveEventsReply(liveEvents);
  }
  if (best.kind === "recommend") {
    const key = asRecoKey(best.reco) ?? "hangout";
    return { ...recommendCards(partners, key, 0, undefined, false, detectMentionedRegion(question, partners)), taught: true };
  }
  if (best.kind === "search") {
    const query = best.answer.trim() || best.reco.trim() || question;
    return { ...searchCards(partners, query, 0), taught: true };
  }
  const text = best.answer.trim();
  return text ? { text, taught: true } : null;
}

export function buildChatbotReply(
  questionRaw: string,
  partners: SitePartnerHint[],
  intent?: ChatbotIntent | null,
  lessons: AiChatbotLesson[] = [],
  liveEvents: ChatbotLiveEventLine[] = [],
): ChatbotReply {
  const question = questionRaw.replace(/\s+/g, " ").trim();
  const region = detectMentionedRegion(question, partners);

  if (!intent && lessons.length > 0) {
    const taught = applyChatbotLessons(question, partners, lessons, liveEvents);
    if (taught) return taught;
  }

  if (!intent && isLiveEventsQuestion(question)) {
    return formatLiveEventsReply(liveEvents);
  }

  if (intent?.type === "partner_list" && !intent.query) {
    return categoryChoices(partners, intent.offset);
  }
  if (intent?.type === "partner_list" && intent.query) {
    return cardsForCategory(partners, intent.query, intent.offset);
  }
  if (intent?.type === "meal_recommend") {
    if (intent.query === "choice-list") {
      return recommendChoices(intent.offset);
    }
    const key = asRecoKey(intent.query) ?? asRecoKey(question) ?? "rice";
    const intentRegion = intent.region
      ? detectMentionedRegion(intent.region, partners) ?? { needle: compactText(intent.region), label: intent.region }
      : region;
    return recommendCards(partners, key, intent.offset, intent.seed, false, intentRegion);
  }
  if (intent?.type === "partner_search") {
    if (intent.region) {
      const intentRegion =
        detectMentionedRegion(intent.region, partners) ?? { needle: compactText(intent.region), label: intent.region };
      return randomRegionCards(partners, intentRegion, intent.offset, intent.seed);
    }
    const query = intent.query?.trim() || question;
    const categories = uniqueCategories(partners);
    if (categories.includes(query)) {
      return cardsForCategory(partners, query, intent.offset);
    }
    return searchCards(partners, query, intent.offset);
  }

  if (question === "더보기") {
    return { text: "이어서 볼 목록이 없습니다. 제휴 이름이나 「제휴 목록이 뭐있어?」로 물어보세요." };
  }

  if (isListQuestion(question)) {
    return categoryChoices(partners, 0);
  }

  if (isRecommendQuestion(question)) {
    const key = detectRecoKey(question);
    if (key === "choices" || !key) {
      return recommendCards(partners, mealKeyByKstTime(), 0, undefined, true, region);
    }
    return recommendCards(partners, key, 0, undefined, false, region);
  }

  if (isCafeQuestion(compactText(question))) {
    if (region) {
      const cafes = filterPartnersByRegion(partners, region).filter((partner) => {
        const hay = partnerHay(partner);
        const category = compactText(String(partner.category ?? ""));
        return CAFE_HINTS.some((item) => category.includes(item) || hay.includes(item));
      });
      if (cafes.length > 0) {
        return randomRegionCards(cafes, region, 0);
      }
    }
    return searchCards(partners, "카페", 0);
  }

  const named = mentionedPartners(question, partners).map(toCard).filter((item) => item.name);
  if (named.length > 0) {
    const label = named[0]?.name || "제휴";
    return paginateCards(
      named,
      0,
      { type: "partner_search", query: label, offset: 0 },
      "관련 제휴가 없습니다.",
      `${label} 제휴 정보입니다.`,
    );
  }

  const categories = uniqueCategories(partners);
  const categoryHit = mentionedCategory(question, categories);
  if (categoryHit) {
    return cardsForCategory(partners, categoryHit, 0);
  }

  if (region) {
    return randomRegionCards(partners, region, 0);
  }

  const guide = siteGuideReply(question);
  if (guide) return guide;

  const search = extractSearchQuery(question);
  if (search.length >= 1) {
    const leftoverKey = asRecoKey(search);
    if (leftoverKey) {
      return recommendCards(partners, leftoverKey, 0);
    }
    const category =
      search.length >= 2
        ? categories.find((item) => compactText(item) === search) ||
          categories.find((item) => compactText(item).includes(search) || search.includes(compactText(item)))
        : undefined;
    if (category && search.length >= 2 && (compactText(category) === search || compactText(category).includes(search))) {
      return cardsForCategory(partners, category, 0);
    }
    return searchCards(partners, search, 0);
  }

  if (categories.includes(question)) {
    return cardsForCategory(partners, question, 0);
  }

  const scored = partners
    .map((partner) => ({ partner, score: scorePartner(partner, question) }))
    .filter((item) => item.score >= 8 && String(item.partner.name ?? "").trim())
    .sort((a, b) => b.score - a.score)
    .map((item) => toCard(item.partner));

  if (scored.length > 0) {
    return paginateCards(
      scored,
      0,
      { type: "partner_search", query: question, offset: 0 },
      "관련 제휴가 없습니다.",
      "관련 제휴를 찾았습니다.",
    );
  }

  return {
    text: "사이트에 있는 제휴·혜택·이벤트 정보로만 안내합니다. 「제휴 목록이 뭐있어?」 또는 「업체이름 찾아줘」로 물어보세요.",
  };
}

export function replyFromSite(questionRaw: string, partners: SitePartnerHint[]) {
  return buildChatbotReply(questionRaw, partners).text;
}
