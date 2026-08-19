"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applySiteScalePresetFromFontSize,
  loadUserBetaSettings,
  patchUserBetaSettings,
  USER_BETA_SETTINGS_EVENT,
  type UserBetaSettings,
} from "@/lib/user-beta-settings";
import { DEFAULT_OPTIONAL_TEXT_COLOR, normalizeOptionalLinkUrl } from "@/lib/footer-text";
import { useIsMobileDevice } from "@/lib/mobile-viewport";
import {
  MAIN_FONT_SIZE_OPTIONS,
  type MainFontSize,
} from "@/lib/main-font-size";
import {
  MAIN_BOARD_POSITION_OPTIONS,
  type MainBoardPosition,
} from "@/lib/main-board-position";
import { useAppBackHandler } from "@/lib/app-back-stack";
import { getSiteMemberSession, clearSiteMemberSession } from "@/lib/site-member-session";
import DeleteAccountConfirmDialog from "@/components/DeleteAccountConfirmDialog";

const EXPERIMENTAL_SECTION_LABEL = "실험실";
const EXPERIMENTAL_BADGE_LABEL = "Beta";

type MainBetaSettingsButtonProps = {
  settingsPanelEnabled?: boolean;
  layout?: "fixed" | "toolbar";
  darkModeAvailable?: boolean;
  mobilePcModeAvailable?: boolean;
  fontSizeAvailable?: boolean;
  boardPositionAvailable?: boolean;
  pageBackgroundAvailable?: boolean;
  pageBackgroundDefaultEnabled?: boolean;
  navBackgroundToggleAvailable?: boolean;
  navBackgroundDefaultEnabled?: boolean;
  navFloatingChipsToggleAvailable?: boolean;
  navFloatingChipsDefaultEnabled?: boolean;
  defaultBoardPosition?: MainBoardPosition;
  categoryRegionToggleAvailable?: boolean;
  mainMapToggleAvailable?: boolean;
  noticeText?: string | null;
  noticeUrl?: string | null;
  noticeColor?: string | null;
};

function DarkModeStateIcon({ dark }: { dark: boolean }) {
  if (dark) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 text-amber-500"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4 text-indigo-500"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  beta,
  darkModeIcons = false,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  beta?: boolean;
  darkModeIcons?: boolean;
}) {
  return (
    <label className="main-settings-row flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <span className="main-settings-row-label inline-flex items-center gap-1.5 text-sm font-medium text-gray-800">
        {darkModeIcons ? <DarkModeStateIcon dark={checked} /> : null}
        {label}
        {beta && (
          <span className="main-settings-beta-badge rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
            {EXPERIMENTAL_BADGE_LABEL}
          </span>
        )}
      </span>
      <span className="main-settings-toggle-meta flex shrink-0 items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        {darkModeIcons ? (checked ? "다크" : "라이트") : checked ? "활성화" : "비활성화"}
      </span>
    </label>
  );
}

function SiteSizeRow({
  value,
  scalePercent,
  onChange,
  beta,
}: {
  value: MainFontSize;
  scalePercent: number;
  onChange: (value: MainFontSize) => void;
  beta?: boolean;
}) {
  return (
    <div className="main-settings-row rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="main-settings-row-label text-sm font-medium text-gray-800">사이트 크기</span>
        {beta && (
          <span className="main-settings-beta-badge rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
            {EXPERIMENTAL_BADGE_LABEL}
          </span>
        )}
      </div>
      <p className="main-settings-row-meta mt-0.5 text-xs text-gray-500">
        현재 {scalePercent}% · 제휴 목록·게시판 등 화면 전체 크기
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {MAIN_FONT_SIZE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`main-settings-option flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
              value === option.value
                ? "main-settings-option--selected border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-gray-200 bg-white text-gray-700"
            }`}
          >
            <input
              type="radio"
              name="main-site-size"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="h-3.5 w-3.5 border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function BoardPositionRow({
  value,
  defaultValue,
  onChange,
  beta,
}: {
  value: MainBoardPosition | null;
  defaultValue: MainBoardPosition;
  onChange: (value: MainBoardPosition) => void;
  beta?: boolean;
}) {
  const selectedValue = value ?? defaultValue;

  return (
    <div className="main-settings-row rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="main-settings-row-label text-sm font-medium text-gray-800">게시판 위치</span>
        {beta && (
          <span className="main-settings-beta-badge rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
            {EXPERIMENTAL_BADGE_LABEL}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        {MAIN_BOARD_POSITION_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`main-settings-option flex flex-1 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
              selectedValue === option.value
                ? "main-settings-option--selected border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-gray-200 bg-white text-gray-700"
            }`}
          >
            <input
              type="radio"
              name="main-board-position"
              checked={selectedValue === option.value}
              onChange={() => onChange(option.value)}
              className="h-3.5 w-3.5 border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function NoticeSection({
  text,
  url,
  color,
}: {
  text: string;
  url: string;
  color?: string | null;
}) {
  const trimmedText = text.trim();
  const trimmedUrl = normalizeOptionalLinkUrl(url) ?? "";
  const textStyle = { color: color?.trim() || DEFAULT_OPTIONAL_TEXT_COLOR };

  if (!trimmedText) {
    return null;
  }

  return (
    <div className="mt-3 main-settings-notice overflow-x-auto rounded-lg border border-gray-100 bg-white px-3 py-2.5 text-xs leading-relaxed">
      {trimmedUrl ? (
        <a
          href={trimmedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block whitespace-pre transition hover:opacity-90"
          style={textStyle}
        >
          {trimmedText}
        </a>
      ) : (
        <p className="whitespace-pre" style={textStyle}>
          {trimmedText}
        </p>
      )}
    </div>
  );
}

export default function MainBetaSettingsButton({
  settingsPanelEnabled = false,
  layout = "fixed",
  darkModeAvailable = false,
  mobilePcModeAvailable = false,
  fontSizeAvailable = false,
  boardPositionAvailable = false,
  pageBackgroundAvailable = false,
  pageBackgroundDefaultEnabled = true,
  navBackgroundToggleAvailable = false,
  navBackgroundDefaultEnabled = false,
  navFloatingChipsToggleAvailable = false,
  navFloatingChipsDefaultEnabled = true,
  defaultBoardPosition = "above",
  categoryRegionToggleAvailable = false,
  mainMapToggleAvailable = false,
  noticeText,
  noticeUrl,
  noticeColor,
}: MainBetaSettingsButtonProps) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<UserBetaSettings>(() => loadUserBetaSettings());
  const isMobileDevice = useIsMobileDevice();
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountMessage, setDeleteAccountMessage] = useState<string | null>(null);
  const [memberLoggedIn, setMemberLoggedIn] = useState(false);

  useEffect(() => {
    function syncLogin() {
      setMemberLoggedIn(Boolean(getSiteMemberSession()?.student?.studentId?.trim()));
    }
    syncLogin();
    window.addEventListener("site-member-session-changed", syncLogin);
    return () => window.removeEventListener("site-member-session-changed", syncLogin);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  useAppBackHandler(open, closePanel, "main-beta-settings-panel");

  const showMobilePcToggle = mobilePcModeAvailable && isMobileDevice;
  const trimmedNotice = noticeText?.trim() ?? "";
  const trimmedNoticeUrl = noticeUrl?.trim() ?? "";
  const effectivePageBackground =
    prefs.page_background ?? pageBackgroundDefaultEnabled;
  const effectiveNavBackground =
    prefs.site_nav_background ?? navBackgroundDefaultEnabled;
  const effectiveNavFloatingChips =
    prefs.site_nav_floating_chips ?? navFloatingChipsDefaultEnabled;
  const hasMainScreenToggles = categoryRegionToggleAvailable || mainMapToggleAvailable;
  const hasBetaFeatures =
    fontSizeAvailable ||
    darkModeAvailable ||
    showMobilePcToggle ||
    boardPositionAvailable ||
    pageBackgroundAvailable ||
    navBackgroundToggleAvailable ||
    navFloatingChipsToggleAvailable;
  const hasPanelContent = settingsPanelEnabled && (hasBetaFeatures || hasMainScreenToggles || Boolean(trimmedNotice));

  const refresh = useCallback(() => {
    setPrefs(loadUserBetaSettings());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(USER_BETA_SETTINGS_EVENT, refresh);
    return () => window.removeEventListener(USER_BETA_SETTINGS_EVENT, refresh);
  }, [refresh]);

  function update(patch: Partial<UserBetaSettings>) {
    patchUserBetaSettings(patch);
    setPrefs(loadUserBetaSettings());
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    setDeleteAccountMessage(null);
    try {
      const session = getSiteMemberSession();
      const studentId = session?.student?.studentId?.trim() || "";
      if (!studentId) {
        setDeleteAccountMessage("로그인 후 탈퇴할 수 있습니다.");
        return;
      }

      const response = await fetch("/api/auth/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session?.displayName ?? "",
          providerToken: session?.provider_token ?? "",
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };

      if (!response.ok || payload.error) {
        setDeleteAccountMessage(payload.error || "회원 탈퇴에 실패했습니다.");
        return;
      }

      setDeleteAccountMessage(payload.message || "회원탈퇴가 완료되었습니다.");
      setDeleteAccountConfirm(false);

      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      setDeleteAccountMessage(
        error instanceof Error ? error.message : "회원 탈퇴에 실패했습니다.",
      );
    } finally {
      setDeletingAccount(false);
    }
  }

  const panelTitle = useMemo(() => {
    if (
      fontSizeAvailable ||
      darkModeAvailable ||
      showMobilePcToggle ||
      boardPositionAvailable ||
      pageBackgroundAvailable ||
      navBackgroundToggleAvailable ||
      navFloatingChipsToggleAvailable
    ) {
      return EXPERIMENTAL_SECTION_LABEL;
    }
    return null;
  }, [
    fontSizeAvailable,
    darkModeAvailable,
    showMobilePcToggle,
    boardPositionAvailable,
    pageBackgroundAvailable,
    navBackgroundToggleAvailable,
    navFloatingChipsToggleAvailable,
  ]);

  if (!hasPanelContent) {
    return null;
  }

  const rootClassName =
    layout === "toolbar"
      ? "main-beta-settings-root main-beta-settings-root--toolbar relative"
      : "main-beta-settings-root fixed right-3 top-3 z-50 sm:right-4 sm:top-4";

  const triggerClassName =
    layout === "toolbar"
      ? "main-settings-trigger site-top-toolbar__button flex h-9 w-9 shrink-0 items-center justify-center"
      : "main-settings-trigger flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-black/45 text-white shadow-lg transition hover:bg-black/55";

  return (
    <div className={rootClassName}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={triggerClassName}
        aria-label="설정"
        title="설정"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="설정 닫기"
            onClick={() => setOpen(false)}
          />
          <div className="main-settings-panel absolute right-0 top-11 z-50 w-max max-w-[min(92vw,28rem)] min-w-[14rem] rounded-xl border border-gray-200 bg-white p-3 shadow-xl ring-1 ring-gray-100">
            <p className="main-settings-title mb-2 text-sm font-semibold text-gray-900">설정</p>
            {hasBetaFeatures && (
              <div className="main-settings-lab rounded-xl border border-gray-200 bg-gray-50 p-3">
                {panelTitle && (
                  <p className="main-settings-section-label mb-2 text-xs font-semibold tracking-wide text-gray-500">
                    {panelTitle}
                  </p>
                )}
                <div className="space-y-2">
                  {fontSizeAvailable && (
                    <SiteSizeRow
                      value={prefs.font_size}
                      scalePercent={prefs.site_scale_percent}
                      onChange={(value) => {
                        applySiteScalePresetFromFontSize(value);
                        setPrefs(loadUserBetaSettings());
                      }}
                      beta
                    />
                  )}
                  {boardPositionAvailable && (
                    <BoardPositionRow
                      value={prefs.board_position}
                      defaultValue={defaultBoardPosition}
                      onChange={(value) => update({ board_position: value })}
                      beta
                    />
                  )}
                  {darkModeAvailable && (
                    <ToggleRow
                      label="다크 모드"
                      checked={prefs.dark_mode}
                      onChange={(value) => update({ dark_mode: value })}
                      beta
                      darkModeIcons
                    />
                  )}
                  {showMobilePcToggle && (
                    <ToggleRow
                      label="모바일 PC 모드"
                      checked={prefs.mobile_pc_mode}
                      onChange={(value) => update({ mobile_pc_mode: value })}
                      beta
                    />
                  )}
                  {pageBackgroundAvailable && (
                    <ToggleRow
                      label="배경 뽀로롱"
                      checked={effectivePageBackground}
                      onChange={(value) => update({ page_background: value })}
                      beta
                    />
                  )}
                  {navBackgroundToggleAvailable && (
                    <ToggleRow
                      label="상단 메뉴 배경 변경"
                      checked={effectiveNavBackground}
                      onChange={(value) => update({ site_nav_background: value })}
                      beta
                    />
                  )}
                  {navFloatingChipsToggleAvailable ? (
                    <ToggleRow
                      label="상단 메뉴 변경"
                      checked={effectiveNavFloatingChips}
                      onChange={(value) => update({ site_nav_floating_chips: value })}
                      beta
                    />
                  ) : null}
                </div>
              </div>
            )}
            {hasMainScreenToggles ? (
              <div className={`${hasBetaFeatures ? "mt-3" : ""} space-y-2`}>
                <p className="main-settings-section-label text-xs font-semibold tracking-wide text-gray-500">
                  메인 화면
                </p>
                {categoryRegionToggleAvailable ? (
                  <ToggleRow
                    label="카테고리·지역"
                    checked={prefs.show_category_region ?? true}
                    onChange={(value) => update({ show_category_region: value })}
                  />
                ) : null}
                {mainMapToggleAvailable ? (
                  <ToggleRow
                    label="제휴 지도"
                    checked={prefs.show_main_map ?? true}
                    onChange={(value) => update({ show_main_map: value })}
                  />
                ) : null}
              </div>
            ) : null}
            <NoticeSection text={trimmedNotice} url={trimmedNoticeUrl} color={noticeColor} />
            
            {memberLoggedIn ? (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setDeleteAccountConfirm(true);
                  }}
                  className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition"
                >
                  회원 탈퇴
                </button>
                {deleteAccountMessage && (
                  <p className="mt-2 text-xs text-red-600">{deleteAccountMessage}</p>
                )}
              </div>
            ) : null}
          </div>
        </>
      )}

      <DeleteAccountConfirmDialog
        open={deleteAccountConfirm && memberLoggedIn}
        busy={deletingAccount}
        onCancel={() => setDeleteAccountConfirm(false)}
        onConfirm={() => void handleDeleteAccount()}
      />
    </div>
  );
}