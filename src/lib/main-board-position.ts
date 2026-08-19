export type MainBoardPosition = "above" | "below";

export const MAIN_BOARD_POSITION_OPTIONS: {
  value: MainBoardPosition;
  label: string;
}[] = [
  { value: "above", label: "제휴 목록 위" },
  { value: "below", label: "제휴 목록 아래" },
];

export function normalizeMainBoardPosition(value: unknown): MainBoardPosition {
  return value === "below" ? "below" : "above";
}

export function isBoardAbovePartners(position: MainBoardPosition): boolean {
  return position !== "below";
}

export function getEffectiveMainBoardPosition(
  userPosition: MainBoardPosition | null | undefined,
  adminDefault: unknown,
  userChoiceEnabled: boolean,
): MainBoardPosition {
  const defaultPosition = normalizeMainBoardPosition(adminDefault);

  if (userChoiceEnabled && userPosition) {
    return userPosition;
  }

  return defaultPosition;
}

type MainBoardPlacementSettings = {
  board_main_position_enabled?: boolean | null;
  main_board_position_default?: string | null;
  main_board_position_enabled?: boolean | null;
};

export function resolveMainBoardPlacement(
  settings: MainBoardPlacementSettings,
  userPosition?: MainBoardPosition | null,
): MainBoardPosition {
  if (settings.board_main_position_enabled === false) {
    return "below";
  }

  return getEffectiveMainBoardPosition(
    userPosition,
    settings.main_board_position_default,
    settings.main_board_position_enabled ?? false,
  );
}
