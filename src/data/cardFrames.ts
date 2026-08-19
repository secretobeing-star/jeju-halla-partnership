/**
 * 학생증 카드 테두리(Frame) 전용 아이템 카탈로그.
 * 관리자 UI / DB(site_student_card_frames)와 병합되며,
 * 아래 템플릿을 직접 채워도 시드로 동작합니다.
 */

export interface CardFrameItem {
  id: string; // 테두리 고유 ID
  name: string; // 테두리 이름
  imageUrl: string; // 테두리 이미지 경로 또는 Data URL (PNG/SVG)
  cssBorder?: string; // (선택) CSS 스타일 테두리 (예: border 속성값)
  itemCode: string; // 해금용 시크릿 코드
  description: string; // 설명
  isDefaultUnlocked: boolean; // 기본 제공 여부
}

/** 클라이언트로 내려보낼 때 itemCode를 제거한 공개 형태 */
export type PublicCardFrameItem = Omit<CardFrameItem, "itemCode">;

/** 빈 등록 슬롯 — 직접 채우거나 관리자에서 동적으로 추가 */
export const EMPTY_CARD_FRAME_ITEM: CardFrameItem = {
  id: "",
  name: "",
  imageUrl: "",
  cssBorder: "",
  itemCode: "",
  description: "",
  isDefaultUnlocked: false,
};

export const CARD_FRAME_ITEMS: CardFrameItem[] = [
  {
    id: "",
    name: "",
    imageUrl: "",
    cssBorder: "",
    itemCode: "",
    description: "",
    isDefaultUnlocked: false,
  },
  {
    id: "",
    name: "",
    imageUrl: "",
    cssBorder: "",
    itemCode: "",
    description: "",
    isDefaultUnlocked: false,
  },
  {
    id: "",
    name: "",
    imageUrl: "",
    cssBorder: "",
    itemCode: "",
    description: "",
    isDefaultUnlocked: false,
  },
];

export function isCardFrameItemFilled(
  item: Partial<CardFrameItem> | null | undefined,
): item is CardFrameItem {
  if (!item || typeof item !== "object") {
    return false;
  }
  return Boolean(item.id?.trim() && item.name?.trim());
}

export function createEmptyCardFrameItem(partial?: Partial<CardFrameItem>): CardFrameItem {
  return {
    ...EMPTY_CARD_FRAME_ITEM,
    ...partial,
    id: partial?.id?.trim() || "",
    name: partial?.name ?? "",
    imageUrl: partial?.imageUrl ?? "",
    cssBorder: partial?.cssBorder ?? "",
    itemCode: partial?.itemCode ?? "",
    description: partial?.description ?? "",
    isDefaultUnlocked: Boolean(partial?.isDefaultUnlocked),
  };
}
