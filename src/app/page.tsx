"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BoardSection from "@/components/BoardSection";
import BottomPcAdBanner from "@/components/BottomPcAdBanner";
import MobileAdBanner from "@/components/MobileAdBanner";
import Pagination from "@/components/Pagination";
import MapEventMapSection from "@/components/MapEventMapSection";
import PartnerRegionFilterPanel from "@/components/PartnerRegionFilterPanel";
import PartnerYearFilterDropdown from "@/components/PartnerYearFilterDropdown";
import BoardPostModal from "@/components/BoardPostModal";
import SiteNavTitleDropdown from "@/components/SiteNavTitleDropdown";
import PartnerDetailView from "@/components/PartnerDetailView";
import PartnerPostGrid from "@/components/PartnerPostGrid";
import SidebarAd from "@/components/SidebarAd";
import LoadingStateDisplay from "@/components/LoadingStateDisplay";
import { usePartnerLocalFranchiseStatus } from "@/lib/use-partner-local-franchise";
import DarkModeToggleButton from "@/components/DarkModeToggleButton";
import MainBetaSettingsButton from "@/components/MainBetaSettingsButton";
import FloatingPageControls from "@/components/FloatingPageControls";
import SiteFeaturesApplier from "@/components/SiteFeaturesApplier";
import SitePopupModal from "@/components/SitePopupModal";
import SiteEventsBoardSection from "@/components/SiteEventsBoardSection";
import GiftInboxNavChip from "@/components/GiftInboxNavChip";
import FrameInventoryNavChip from "@/components/FrameInventoryNavChip";
import SiteBrowserGuideBanner from "@/components/SiteBrowserGuideBanner";
import SiteAppBackSettingsSync from "@/components/SiteAppBackSettingsSync";
import SiteAppBackLoadingSplashSync from "@/components/SiteAppBackLoadingSplashSync";
import { syncSiteAppBackExitSettings } from "@/lib/app-back-stack";
import SiteNoticeCarousel from "@/components/SiteNoticeCarousel";
import SitePartnerSearch from "@/components/SitePartnerSearch";
import SiteTopNav from "@/components/SiteTopNav";
import SiteHeaderActions from "@/components/SiteHeaderActions";
import SiteTopToolbar from "@/components/SiteTopToolbar";
import StudentIdProvider from "@/components/student/StudentIdProvider";
import { getSiteMemberFeaturesDisplay, shouldShowSiteHeaderActions } from "@/lib/site-member-settings";
import {
  getSiteMemberSession,
  SITE_MEMBER_SESSION_EVENT,
} from "@/lib/site-member-session";
import { getSiteStudentAuthDisplay } from "@/lib/site-student-auth-settings";
import {
  resolveCardFrameCatalog,
  toPublicCardFrames,
} from "@/lib/student-card-frames";
import SiteFaviconApplier from "@/components/SiteFaviconApplier";
import SitePwaLoadingSplash from "@/components/SitePwaLoadingSplash";
import { useSitePwaLoadingSplash } from "@/hooks/useSitePwaLoadingSplash";
import {
  cachePwaLoadingSettings,
  getPwaLoadingBackgroundColor,
  getPwaLoadingImageUrl,
  getPwaLoadingMessage,
  isPwaLoadingImageFullscreen,
  shouldUsePwaLoadingSplash,
} from "@/lib/site-pwa-loading";
import {
  appendPwaAssetVersion,
  buildPwaManifestVersion,
  hasPwaAppSettingsPanelContent,
  isPwaAppSettingsEnabled,
  isPwaEnabled,
  resolvePwaIconUrl,
} from "@/lib/site-pwa";
import { readPwaDeviceViewportHeight, readPwaDeviceViewportWidth } from "@/lib/pwa-fold-viewport";
import { subscribeLayoutViewport } from "@/lib/layout-viewport";
import { useStandaloneDisplayMode } from "@/hooks/useStandaloneDisplayMode";
import { SitePwaInstallProvider } from "@/components/SitePwaInstallProvider";
import SitePwaAppSettingsButton from "@/components/SitePwaAppSettingsButton";
import SitePwaFirstRunPermissions from "@/components/SitePwaFirstRunPermissions";
import SitePwaRuntime from "@/components/SitePwaRuntime";
import SiteTitleApplier from "@/components/SiteTitleApplier";
import { getBoardDefinitions } from "@/lib/board-definitions";
import { getBoardReportReasons } from "@/lib/board-reports";
import {
  dispatchBoardNavVisited,
  markBoardNavSeen,
} from "@/lib/board-nav-new-badge";
import { getHiddenReviewDisplay } from "@/lib/partner-hidden-review";
import { getPartnerDetailDisplaySettings } from "@/lib/partner-detail-display";
import { getPartnerFavoritesDisplaySettings } from "@/lib/partner-favorites-display";
import { favoritesFilterAriaLabel } from "@/lib/a11y-labels";
import { getPageForListIndex, getPopupListNavigation } from "@/lib/popup-list-navigation";
import {
  resolveMainBoardPlacement,
  isBoardAbovePartners,
} from "@/lib/main-board-position";
import { useUserBetaSettings } from "@/lib/use-user-beta-settings";
import {
  getEffectiveSiteNavBackground,
  getEffectiveSiteNavBackgroundDarkEnabled,
  hasConfiguredSiteNavBackground,
} from "@/lib/site-nav-background";
import { getEffectiveSiteNavFloatingChips } from "@/lib/site-nav-floating-chips";
import SiteFooter from "@/components/SiteFooter";
import { shouldShowSiteFooter } from "@/lib/site-footer";
import { DEFAULT_SITE_SETTINGS } from "@/lib/default-site-settings";
import {
  getActiveSiteNoticeItems,
  normalizeNoticeCarouselAutoInterval,
} from "@/lib/site-notices";
import { getPartnerCategories, partnerMatchesCategory } from "@/lib/partner-categories";
import { getPartnerSearchKeywordGroups } from "@/lib/partner-search-keywords";
import { partnerMatchesSearchQuery } from "@/lib/partner-search";
import type { PartnerSearchKeywordGroup } from "@/lib/partner-search-keywords";
import {
  getPartnerYearOptions,
  partnerMatchesYearFilter,
  type PartnerYearFilterValue,
} from "@/lib/partner-partnership-year";
import {
  DEFAULT_PARTNER_REGION_FILTERS,
  getPartnerRegionGroups,
  partnerMatchesRegionFilters,
  type PartnerRegionFilters,
} from "@/lib/partner-regions";
import {
  getActiveSiteNavDropdownLinks,
  getActiveSiteNavLinks,
  getSiteNavLinks,
  getSiteNavSearchPlaceholder,
  isBoardPopupNavHref,
  isFrameInventoryNavHref,
  isGiftInboxNavHref,
  resolveSiteNavBrandLinkUrl,
  resolveSiteNavDisplayTitle,
} from "@/lib/site-nav-links";
import { getMainPartnerMapDisplay } from "@/lib/main-partner-map-settings";
import type { MapMarkerCustomSettings } from "@/lib/naver-map-partner-ui";
import { getInitialPartnerSort, type PartnerSort } from "@/lib/partner-sort";
import { dispatchSiteMapRefresh } from "@/lib/naver-map-layout";
import { getPartnerRecommendationScore } from "@/lib/partner-reaction";
import { getPartnerSortTimestamp } from "@/lib/partner-date";
import { usePartnerListLayout } from "@/lib/partner-list-layout";
import { useTabletSplitPane } from "@/lib/tablet-split-pane";
import { usePartnerFavorites } from "@/lib/use-partner-favorites";
import { canDisplayAdMedia } from "@/lib/ad-media";
import {
  cacheSiteLoadingSettings,
  getPartnersLoadingImageUrl,
  getPartnersLoadingMessage,
  getSiteLoadingImageUrl,
  getSiteLoadingMessage,
} from "@/lib/site-loading-message";
import { Partner, SiteEventWithTabs, SitePopup, SiteSettings, supabase } from "@/lib/supabase";

type PartnerListFilterContext = {
  searchQuery: string;
  partnerCategories: readonly string[];
  searchKeywordGroups: readonly PartnerSearchKeywordGroup[];
  selectedCategory: string;
  selectedYear: PartnerYearFilterValue;
  selectedRegions: PartnerRegionFilters;
  regionFilterEnabled: boolean;
  yearFilterEnabled: boolean;
  showFavoritesOnly: boolean;
  favoriteIds: ReadonlySet<string>;
  partnerSort: PartnerSort;
};

function filterAndSortPartners(source: Partner[], ctx: PartnerListFilterContext): Partner[] {
  const filtered = source.filter((partner) => {
    const matchesCategory =
      ctx.selectedCategory === "전체" ||
      partnerMatchesCategory(partner.category, ctx.selectedCategory);

    if (!matchesCategory) return false;

    const matchesRegion =
      !ctx.regionFilterEnabled ||
      partnerMatchesRegionFilters(partner.region, ctx.selectedRegions);

    if (!matchesRegion) return false;

    const matchesYear =
      !ctx.yearFilterEnabled || partnerMatchesYearFilter(partner, ctx.selectedYear);

    if (!matchesYear) return false;
    if (ctx.showFavoritesOnly && !ctx.favoriteIds.has(partner.id)) return false;

    return partnerMatchesSearchQuery(partner, ctx.searchQuery, {
      partnerCategories: ctx.partnerCategories,
      searchKeywordGroups: ctx.searchKeywordGroups,
    });
  });

  const list = [...filtered];
  list.sort((a, b) => {
    if (ctx.partnerSort === "recommended") {
      const scoreA = getPartnerRecommendationScore(a);
      const scoreB = getPartnerRecommendationScore(b);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return a.name.localeCompare(b.name, "ko");
    }

    const tsA = getPartnerSortTimestamp(a);
    const tsB = getPartnerSortTimestamp(b);
    if (tsA !== tsB) {
      return ctx.partnerSort === "old" ? tsA - tsB : tsB - tsA;
    }
    return a.name.localeCompare(b.name, "ko");
  });

  return list;
}

function HeroBannerImage({ settings }: { settings: SiteSettings }) {
  const bannerUrl = settings.banner_image_url!;
  const content = (
    <img
      src={bannerUrl}
      alt="메인 타이틀 이미지"
      width={3000}
      height={800}
      className="main-title-banner-image site-hero-banner-image"
      decoding="async"
      loading="eager"
      fetchPriority="high"
    />
  );

  const linkUrl = settings.header_title_link_url?.trim();
  if (linkUrl) {
    return (
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="site-hero-banner-link block transition hover:opacity-95"
      >
        {content}
      </a>
    );
  }

  return content;
}

function HeroTitle({
  settings,
  dropdownLinks,
  brandLinkUrl,
  onNavAction,
}: {
  settings: SiteSettings;
  dropdownLinks: ReturnType<typeof getActiveSiteNavDropdownLinks>;
  brandLinkUrl: string | null;
  onNavAction: (href: string) => void;
}) {
  return (
    <h1 className="mt-4 flex justify-center">
      <SiteNavTitleDropdown
        title={resolveSiteNavDisplayTitle(settings.header_title)}
        iconUrl={settings.site_nav_brand_icon_url?.trim() || null}
        brandLinkUrl={brandLinkUrl}
        navLinks={dropdownLinks}
        onNavAction={onNavAction}
        variant="hero"
      />
    </h1>
  );
}

export default function HomePage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [mapPartners, setMapPartners] = useState<Partner[]>([]);
  const [popups, setPopups] = useState<SitePopup[]>([]);
  const [events, setEvents] = useState<SiteEventWithTabs[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [settingsReady, setSettingsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [partnersRefreshing, setPartnersRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [selectedYear, setSelectedYear] = useState<PartnerYearFilterValue>("전체");
  const [selectedRegions, setSelectedRegions] = useState<PartnerRegionFilters>(
    DEFAULT_PARTNER_REGION_FILTERS,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [boardPopupOpen, setBoardPopupOpen] = useState(false);
  const [partnerSort, setPartnerSort] = useState<PartnerSort>("old");
  const standaloneMode = useStandaloneDisplayMode();
  const [pwaViewportWidth, setPwaViewportWidth] = useState(() =>
    typeof window !== "undefined" ? readPwaDeviceViewportWidth() : 390,
  );
  const [pwaViewportHeight, setPwaViewportHeight] = useState(() =>
    typeof window !== "undefined" ? readPwaDeviceViewportHeight() : 844,
  );
  const [mainMapReady, setMainMapReady] = useState(false);
  const partnerListLayout = usePartnerListLayout(settings);
  const { favoriteIds, favoriteCount, isFavorite, toggle: togglePartnerFavorite } =
    usePartnerFavorites();
  const userBetaPrefs = useUserBetaSettings();
  const boardInlineEnabled = settings.board_inline_enabled ?? true;
  const boardAbovePartners = isBoardAbovePartners(
    resolveMainBoardPlacement(settings, userBetaPrefs.board_position),
  );
  const navBackgroundActive =
    (settings.site_nav_background_enabled ?? false) &&
    getEffectiveSiteNavBackground(
      userBetaPrefs.site_nav_background,
      settings.site_nav_background_display_enabled,
    ) &&
    hasConfiguredSiteNavBackground(settings.site_nav_background_image_url);
  const navBackgroundDarkActive = getEffectiveSiteNavBackgroundDarkEnabled(
    navBackgroundActive,
    settings.site_nav_background_dark_enabled ?? false,
  );
  const navFloatingChipsFeatureEnabled = settings.site_nav_floating_chips_enabled ?? true;
  const navFloatingChipsActive =
    navFloatingChipsFeatureEnabled &&
    getEffectiveSiteNavFloatingChips(
      userBetaPrefs.site_nav_floating_chips,
      navFloatingChipsFeatureEnabled,
    );

  const categoryOptions = useMemo(
    () => ["전체", ...getPartnerCategories(settings)],
    [settings.partner_categories],
  );
  const partnerCategories = useMemo(
    () => getPartnerCategories(settings),
    [settings.partner_categories],
  );
  const searchKeywordGroups = useMemo(
    () => getPartnerSearchKeywordGroups(settings),
    [settings.partner_search_keyword_groups],
  );
  const regionGroups = useMemo(
    () => getPartnerRegionGroups(settings),
    [settings.partner_regions],
  );
  const regionFilterEnabled = settings.partner_region_filter_enabled ?? true;
  const regionFilterDefaultExpanded = settings.partner_region_filter_default_expanded ?? false;
  const yearFilterEnabled = settings.partner_year_filter_enabled ?? true;
  const yearOptions = useMemo(() => getPartnerYearOptions(partners), [partners]);
  const activeNavLinks = useMemo(() => getActiveSiteNavLinks(settings), [settings]);
  const [memberStudentLoggedIn, setMemberStudentLoggedIn] = useState(false);
  useEffect(() => {
    function syncMemberLogin() {
      setMemberStudentLoggedIn(
        Boolean(getSiteMemberSession()?.student?.studentId?.trim()),
      );
    }
    syncMemberLogin();
    window.addEventListener(SITE_MEMBER_SESSION_EVENT, syncMemberLogin);
    window.addEventListener("focus", syncMemberLogin);
    return () => {
      window.removeEventListener(SITE_MEMBER_SESSION_EVENT, syncMemberLogin);
      window.removeEventListener("focus", syncMemberLogin);
    };
  }, []);
  const visibleNavLinks = useMemo(() => {
    if (memberStudentLoggedIn) {
      return activeNavLinks;
    }
    return activeNavLinks.filter(
      (link) =>
        !isGiftInboxNavHref(link.href) && !isFrameInventoryNavHref(link.href),
    );
  }, [activeNavLinks, memberStudentLoggedIn]);
  const activeDropdownLinks = useMemo(
    () => getActiveSiteNavDropdownLinks(settings),
    [settings],
  );
  const visibleDropdownLinks = useMemo(() => {
    if (memberStudentLoggedIn) {
      return activeDropdownLinks;
    }
    return activeDropdownLinks.filter(
      (link) =>
        !isGiftInboxNavHref(link.href) && !isFrameInventoryNavHref(link.href),
    );
  }, [activeDropdownLinks, memberStudentLoggedIn]);
  const navSearchPlaceholder = useMemo(
    () => getSiteNavSearchPlaceholder(settings),
    [settings.site_nav_search_placeholder],
  );
  const navBrandLinkUrl = useMemo(
    () =>
      resolveSiteNavBrandLinkUrl({
        brandLinkUrl: settings.site_nav_brand_link_url,
        titleLinkUrl: settings.header_title_link_url,
      }),
    [settings.site_nav_brand_link_url, settings.header_title_link_url],
  );
  const showTopNav = settings.site_nav_enabled ?? true;
  const memberFeatures = useMemo(
    () => getSiteMemberFeaturesDisplay(settings),
    [
      settings.site_login_enabled,
      settings.site_login_preview_enabled,
      settings.site_login_modal_title,
      settings.site_login_notice_line1,
      settings.site_login_status_notice,
      settings.site_login_notice_line2,
      settings.site_login_button_label,
      settings.site_login_provider_label,
      settings.site_login_logo_url,
      settings.site_notifications_enabled,
      settings.site_push_enabled,
      settings.site_student_id_enabled,
    ],
  );
  const studentAuthDisplay = useMemo(() => getSiteStudentAuthDisplay(settings), [
    settings.site_student_id_enabled,
    settings.site_student_id_pwa_swipe_enabled,
    settings.site_student_id_card_title,
    settings.site_student_auth_guide_title,
    settings.site_student_auth_guide_body,
    settings.site_student_auth_guide_image_url,
    settings.site_student_auth_button_label,
    settings.site_student_sheets_spreadsheet_id,
    settings.site_student_sheets_log_tab,
    settings.site_student_sheets_approval_tab,
    settings.site_student_pending_message,
    settings.site_student_ui_labels,
  ]);
  const studentCardFrames = useMemo(
    () =>
      toPublicCardFrames(resolveCardFrameCatalog(settings.site_student_card_frames)),
    [settings.site_student_card_frames],
  );
  const studentCardBrand = useMemo(() => {
    const opacityRaw = settings.site_student_card_center_image_opacity;
    const opacity =
      typeof opacityRaw === "number" && Number.isFinite(opacityRaw)
        ? Math.min(1, Math.max(0, opacityRaw))
        : 0.28;
    const bgOpacityRaw = settings.site_student_card_background_opacity;
    const backgroundOpacity =
      typeof bgOpacityRaw === "number" && Number.isFinite(bgOpacityRaw)
        ? Math.min(1, Math.max(0, bgOpacityRaw))
        : 0.45;
    return {
      schoolLogoUrl: settings.site_student_card_school_logo_url?.trim() || null,
      schoolName: settings.site_student_card_school_name?.trim() || "",
      centerImageUrl: settings.site_student_card_center_image_url?.trim() || null,
      centerImageOpacity: opacity,
      backgroundUrl: settings.site_student_card_background_url?.trim() || null,
      backgroundOpacity,
    };
  }, [
    settings.site_student_card_school_logo_url,
    settings.site_student_card_school_name,
    settings.site_student_card_center_image_url,
    settings.site_student_card_center_image_opacity,
    settings.site_student_card_background_url,
    settings.site_student_card_background_opacity,
  ]);
  const showHeaderActions = shouldShowSiteHeaderActions(memberFeatures);
  const headerActions = showHeaderActions ? (
    <SiteHeaderActions features={memberFeatures} hidePushToggle={standaloneMode} />
  ) : null;
  const settingsPanelEnabled = settings.settings_panel_enabled ?? false;
  const isPhoneNavViewport =
    partnerListLayout.viewport === "mini" ||
    partnerListLayout.viewport === "mobile";
  const isCompactNavViewport = isPhoneNavViewport;
  const showToolbarSearch = showTopNav;
  const activeNoticeItems = useMemo(
    () => getActiveSiteNoticeItems(settings),
    [settings],
  );

  const applySiteSettings = useCallback((
    data: Record<string, unknown>,
    options?: { resetSort?: boolean },
  ) => {
    const merged = {
      ...DEFAULT_SITE_SETTINGS,
      ...data,
      board_definitions: getBoardDefinitions(data),
      partner_categories: getPartnerCategories(data),
      partner_search_keyword_groups: getPartnerSearchKeywordGroups(data),
      site_nav_links: getSiteNavLinks(data),
      // 공개 페이지에서는 시크릿 코드를 메모리에 두지 않음
      site_student_card_frames: toPublicCardFrames(
        resolveCardFrameCatalog(data.site_student_card_frames),
      ),
    };
    setSettings(merged);
    if (options?.resetSort !== false) {
      setPartnerSort(getInitialPartnerSort(merged));
    }
    cacheSiteLoadingSettings(merged);
    cachePwaLoadingSettings(merged);
    // 로딩 스플래시 중에도 바로 뒤로가기 종료 설정 적용 (settingsReady 전)
    syncSiteAppBackExitSettings({
      site_pwa_back_exit_enabled: merged.site_pwa_back_exit_enabled,
      site_pwa_back_exit_message: merged.site_pwa_back_exit_message,
      site_pwa_back_exit_timeout_ms: merged.site_pwa_back_exit_timeout_ms,
      site_pwa_back_exit_popup_enabled: merged.site_pwa_back_exit_popup_enabled,
      site_pwa_back_exit_popup_title: merged.site_pwa_back_exit_popup_title,
      site_pwa_back_exit_popup_message: merged.site_pwa_back_exit_popup_message,
      site_pwa_loading_back_exit_enabled: merged.site_pwa_loading_back_exit_enabled,
    });
  }, []);

  const loadPartners = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    } else {
      setPartnersRefreshing(true);
    }

    const { data } = await supabase
      .from("partners")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (data) {
      const nextPartners = data as Partner[];
      setPartners(nextPartners);
      if (!options?.silent) {
        setMapPartners(nextPartners);
      }
    }

    if (!options?.silent) {
      setLoading(false);
    } else {
      setPartnersRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();

      if (data) {
        applySiteSettings(data);
      }

      setSettingsReady(true);
    }

    void fetchSettings();
  }, [applySiteSettings]);

  useEffect(() => {
    if (!settingsReady) {
      return;
    }

    void loadPartners();
  }, [settingsReady, loadPartners]);

  useEffect(() => {
    if (!settingsReady) {
      return;
    }

    async function fetchPopups() {
      const { data } = await supabase
        .from("site_popups")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (data) {
        setPopups(data as SitePopup[]);
      }
    }

    void fetchPopups();
  }, [settingsReady]);

  useEffect(() => {
    if (!settingsReady) {
      return;
    }

    async function fetchEvents() {
      const { data: eventRows, error: eventError } = await supabase
        .from("site_events")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (eventError || !eventRows?.length) {
        setEvents([]);
        return;
      }

      const eventIds = eventRows.map((row) => row.id as string);
      const { data: tabRows } = await supabase
        .from("site_event_tabs")
        .select("*")
        .in("event_id", eventIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      const tabsByEvent = new Map<string, NonNullable<typeof tabRows>>();
      for (const tab of tabRows ?? []) {
        const list = tabsByEvent.get(tab.event_id as string) ?? [];
        list.push(tab);
        tabsByEvent.set(tab.event_id as string, list);
      }

      setEvents(
        eventRows.map((row) => ({
          ...(row as SiteEventWithTabs),
          tabs: (tabsByEvent.get(row.id as string) ?? []) as SiteEventWithTabs["tabs"],
        })),
      );
    }

    void fetchEvents();
  }, [settingsReady]);

  useEffect(() => {
    if (selectedCategory !== "전체" && !categoryOptions.includes(selectedCategory)) {
      setSelectedCategory("전체");
    }
  }, [categoryOptions, selectedCategory]);

  useEffect(() => {
    if (
      selectedYear !== "전체" &&
      typeof selectedYear === "number" &&
      !yearOptions.includes(selectedYear)
    ) {
      setSelectedYear("전체");
    }
  }, [yearOptions, selectedYear]);

  useEffect(() => {
    const enabledSorts: PartnerSort[] = [];
    if (settings.partner_sort_old_enabled ?? true) enabledSorts.push("old");
    if (settings.partner_sort_new_enabled ?? true) enabledSorts.push("new");
    if (settings.partner_sort_recommended_enabled ?? true) enabledSorts.push("recommended");

    if (!enabledSorts.includes(partnerSort)) {
      setPartnerSort(getInitialPartnerSort(settings));
    }
  }, [
    partnerSort,
    settings.partner_sort_old_enabled,
    settings.partner_sort_new_enabled,
    settings.partner_sort_recommended_enabled,
    settings.partner_default_sort_new,
  ]);

  useEffect(() => {
    async function refreshSettings() {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (data) {
        applySiteSettings(data, { resetSort: false });
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") {
        return;
      }
      dispatchSiteMapRefresh();
      void refreshSettings();
      void loadPartners({ silent: true });
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [applySiteSettings, loadPartners]);

  const partnerListFilterContext = useMemo(
    (): PartnerListFilterContext => ({
      searchQuery,
      partnerCategories,
      searchKeywordGroups,
      selectedCategory,
      selectedYear,
      selectedRegions,
      regionFilterEnabled,
      yearFilterEnabled,
      showFavoritesOnly,
      favoriteIds,
      partnerSort,
    }),
    [
      searchQuery,
      partnerCategories,
      searchKeywordGroups,
      selectedCategory,
      selectedYear,
      selectedRegions,
      regionFilterEnabled,
      yearFilterEnabled,
      showFavoritesOnly,
      favoriteIds,
      partnerSort,
    ],
  );

  const sortedPartners = useMemo(
    () => filterAndSortPartners(partners, partnerListFilterContext),
    [partners, partnerListFilterContext],
  );

  const sortedMapPartners = useMemo(
    () => filterAndSortPartners(mapPartners, partnerListFilterContext),
    [mapPartners, partnerListFilterContext],
  );

  const handlePartnerReactionChange = useCallback((partnerId: string, likeCount: number) => {
    setPartners((prev) =>
      prev.map((partner) =>
        partner.id === partnerId ? { ...partner, like_count: likeCount } : partner,
      ),
    );
  }, []);

  const handlePartnerReviewCountChange = useCallback((partnerId: string, reviewCount: number) => {
    setPartners((prev) =>
      prev.map((partner) =>
        partner.id === partnerId ? { ...partner, review_count: reviewCount } : partner,
      ),
    );
  }, []);

  const partnersPerPage = partnerListLayout.partnersPerPage;

  const totalPages = Math.max(1, Math.ceil(sortedPartners.length / partnersPerPage));

  const paginatedPartners = useMemo(() => {
    const start = (currentPage - 1) * partnersPerPage;
    return sortedPartners.slice(start, start + partnersPerPage);
  }, [sortedPartners, currentPage, partnersPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedYear, selectedRegions, partnerSort, partnersPerPage, showFavoritesOnly]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const hasTitleImage =
    Boolean(settings.banner_image_url) && (settings.banner_image_enabled ?? true);
  const imageOnlyTitle = Boolean(settings.banner_image_only && hasTitleImage);
  const showTitleText = (settings.header_title_enabled ?? true) && !imageOnlyTitle;
  const showSubText = !imageOnlyTitle;
  const adVideoGifEnabled = settings.ad_video_gif_enabled ?? false;

  function isAdVisible(url: string | null | undefined) {
    return Boolean(url && canDisplayAdMedia(url, adVideoGifEnabled));
  }

  const hasLeftAd = isAdVisible(settings.sidebar_left_image_url);
  const hasRightAd = isAdVisible(settings.sidebar_right_image_url);
  const hasMobileHeroAd = isAdVisible(settings.mobile_ad_below_hero_image_url);
  const hasMobileCategoryAd = isAdVisible(settings.mobile_ad_below_category_image_url);
  const hasBottomPcAd = isAdVisible(settings.bottom_pc_ad_image_url);
  const showPartnerSort =
    (settings.partner_sort_old_enabled ?? true) ||
    (settings.partner_sort_new_enabled ?? true) ||
    (settings.partner_sort_recommended_enabled ?? true);
  const partnerReactionsEnabled = settings.partner_reactions_enabled ?? true;
  const partnerReviewsEnabled = settings.partner_reviews_enabled ?? true;
  const partnerListRefreshEnabled = settings.partner_list_refresh_enabled ?? true;
  const partnerFavoritesDisplay = useMemo(
    () => getPartnerFavoritesDisplaySettings(settings),
    [
      settings.partner_favorites_enabled,
      settings.partner_favorites_label,
      settings.partner_favorites_empty_message,
    ],
  );
  const partnerFavoritesEnabled = partnerFavoritesDisplay.enabled;

  useEffect(() => {
    if (!partnerFavoritesEnabled) {
      setShowFavoritesOnly(false);
    }
  }, [partnerFavoritesEnabled]);

  useEffect(() => {
    const updateViewportSize = () => {
      if (document.visibilityState === "hidden") {
        return;
      }
      const nextWidth = readPwaDeviceViewportWidth();
      const nextHeight = readPwaDeviceViewportHeight();
      if (nextWidth < 200 || nextHeight < 200) {
        return;
      }
      setPwaViewportWidth((prev) => (prev === nextWidth ? prev : nextWidth));
      setPwaViewportHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };
    updateViewportSize();
    return subscribeLayoutViewport(updateViewportSize);
  }, []);

  const pwaSplashImageUrl = getPwaLoadingImageUrl(settings, pwaViewportWidth, pwaViewportHeight);
  const waitForMainMap =
    (settings.main_partner_map_enabled ?? false) &&
    (settings.main_partner_map_default_expanded ?? true);
  const handleMainMapReady = useCallback(() => {
    setMainMapReady(true);
  }, []);
  const { visible: pwaSplashVisible, holdMapLoading: pwaHoldMapLoading } = useSitePwaLoadingSplash({
    settings,
    settingsReady,
    contentReady: !loading,
    imageUrl: pwaSplashImageUrl,
    revealReady: !waitForMainMap || mainMapReady,
  });
  const pwaAppSettingsActive = standaloneMode && isPwaAppSettingsEnabled(settings);
  const showPwaAppSettings = pwaAppSettingsActive && hasPwaAppSettingsPanelContent(settings);
  const pwaPermissionsReady = settingsReady && !pwaSplashVisible;
  const pwaSplashProps = useMemo(
    () => ({
      message: getPwaLoadingMessage(settings),
      imageUrl: pwaSplashImageUrl,
      backgroundColor: getPwaLoadingBackgroundColor(settings),
      fullScreenImage: isPwaLoadingImageFullscreen(settings, pwaViewportWidth, pwaViewportHeight),
    }),
    [
      settings.site_pwa_loading_message,
      settings.site_pwa_loading_image_url,
      settings.site_pwa_loading_image_url_fold_cover,
      settings.site_pwa_loading_image_url_tablet,
      settings.site_pwa_loading_image_url_tablet_ultra,
      settings.site_pwa_icon_url,
      settings.site_pwa_background_color,
      pwaViewportWidth,
      pwaViewportHeight,
      pwaSplashImageUrl,
    ],
  );
  const browserGuideIconUrl = useMemo(() => {
    const rawIconUrl = resolvePwaIconUrl(settings);
    if (!rawIconUrl) {
      return null;
    }

    return appendPwaAssetVersion(rawIconUrl, buildPwaManifestVersion(settings));
  }, [settings]);
  const showPartnerListToolbar =
    showToolbarSearch ||
    (yearFilterEnabled && yearOptions.length > 0) ||
    showPartnerSort ||
    partnerListRefreshEnabled ||
    partnerFavoritesEnabled;
  const partnerListSummary =
    !loading && sortedPartners.length > 0
      ? `총 ${sortedPartners.length}개 · ${currentPage}/${totalPages} 페이지`
      : null;
  const hiddenReviewDisplay = useMemo(
    () => getHiddenReviewDisplay(settings),
    [settings.partner_hidden_review_title, settings.partner_hidden_review_message],
  );
  const reportReasons = useMemo(
    () => getBoardReportReasons(settings),
    [settings, settings.board_report_reasons],
  );
  const partnerDetailDisplay = useMemo(
    () => getPartnerDetailDisplaySettings(settings),
    [
      settings.partner_detail_section_label,
      settings.partner_map_section_label,
      settings.partner_detail_popup_max_width_rem,
    ],
  );
  const mainPartnerMapDisplay = useMemo(
    () => getMainPartnerMapDisplay(settings),
    [
      settings.main_partner_map_enabled,
      settings.main_partner_map_title,
      settings.main_partner_map_default_expanded,
    ],
  );
  const mapMarkerSettings = useMemo((): MapMarkerCustomSettings => ({
    borderColor: settings.site_map_marker_border_color ?? null,
    bgImg: settings.site_map_marker_bg_img ?? null,
    thumbnailEnabled: settings.site_map_marker_thumbnail_enabled ?? true,
    topIconImg: settings.site_map_marker_top_icon_img ?? null,
    timeIcon: settings.site_map_marker_time_icon ?? null,
    timeFormat: settings.site_map_marker_time_format ?? null,
  }), [
    settings.site_map_marker_border_color,
    settings.site_map_marker_bg_img,
    settings.site_map_marker_thumbnail_enabled,
    settings.site_map_marker_top_icon_img,
    settings.site_map_marker_time_icon,
    settings.site_map_marker_time_format,
  ]);
  const showCategoryRegionSection =
    (settings.partner_category_section_enabled ?? true) &&
    (userBetaPrefs.show_category_region ?? true);
  const detailPopupEnabled =
    settings.board_post_popup_enabled ?? DEFAULT_SITE_SETTINGS.board_post_popup_enabled;
  const tabletSplitPane = useTabletSplitPane();
  const showPartnerTabletSplit = detailPopupEnabled && tabletSplitPane;
  const selectedPartner = useMemo(
    () => partners.find((partner) => partner.id === selectedPartnerId) ?? null,
    [partners, selectedPartnerId],
  );
  const partnerPopupNavigation = useMemo(
    () => getPopupListNavigation(sortedPartners, selectedPartnerId),
    [sortedPartners, selectedPartnerId],
  );
  const partnersForLocalFranchiseCheck = useMemo(() => {
    const byId = new Map(paginatedPartners.map((partner) => [partner.id, partner]));
    if (selectedPartner) {
      byId.set(selectedPartner.id, selectedPartner);
    }
    return [...byId.values()];
  }, [paginatedPartners, selectedPartner]);
  const { results: localFranchiseByPartnerId } = usePartnerLocalFranchiseStatus(
    partnersForLocalFranchiseCheck,
  );

  const closePartnerPopup = useCallback(() => {
    setSelectedPartnerId(null);
  }, []);

  const handleTopNavAction = useCallback((href: string) => {
    if (isBoardPopupNavHref(href)) {
      markBoardNavSeen();
      dispatchBoardNavVisited();
      setBoardPopupOpen(true);
      return;
    }
    if (isGiftInboxNavHref(href)) {
      window.dispatchEvent(new Event("site-gift-inbox-open"));
      return;
    }
    if (isFrameInventoryNavHref(href)) {
      window.dispatchEvent(new Event("site-frame-inventory-open"));
    }
  }, []);

  const navHasGiftInbox = useMemo(
    () =>
      memberStudentLoggedIn &&
      activeNavLinks.some((link) => isGiftInboxNavHref(link.href)),
    [activeNavLinks, memberStudentLoggedIn],
  );
  const navHasFrameInventory = useMemo(
    () =>
      memberStudentLoggedIn &&
      activeNavLinks.some((link) => isFrameInventoryNavHref(link.href)),
    [activeNavLinks, memberStudentLoggedIn],
  );

  const closeBoardPopup = useCallback(() => {
    setBoardPopupOpen(false);
  }, []);

  const goToPreviousPartner = useCallback(() => {
    const previous = partnerPopupNavigation.previous;
    if (!previous) {
      return;
    }

    setSelectedPartnerId(previous.id);
    setCurrentPage(getPageForListIndex(partnerPopupNavigation.index - 1, partnersPerPage));
  }, [partnerPopupNavigation, partnersPerPage]);

  const goToNextPartner = useCallback(() => {
    const next = partnerPopupNavigation.next;
    if (!next) {
      return;
    }

    setSelectedPartnerId(next.id);
    setCurrentPage(getPageForListIndex(partnerPopupNavigation.index + 1, partnersPerPage));
  }, [partnerPopupNavigation, partnersPerPage]);
  const showSiteMaintenance =
    (settings.site_maintenance_enabled ?? false) &&
    Boolean(
      settings.site_maintenance_text?.trim() || settings.site_maintenance_image_url,
    );

  const headerBanner = hasTitleImage ? <HeroBannerImage settings={settings} /> : null;
  const showHeroGreenSection =
    (settings.header_hero_enabled ?? true) && !imageOnlyTitle;
  const showHeroHeader = hasTitleImage || showHeroGreenSection;

  const partnerSortControls = (
    <>
      {partnerFavoritesEnabled ? (
        <button
          type="button"
          onClick={() => {
            setShowFavoritesOnly((current) => !current);
            setCurrentPage(1);
          }}
          className={`partner-favorites-filter-btn inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium sm:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
            showFavoritesOnly
              ? "bg-pink-500 text-white"
              : "border border-gray-300 bg-white text-gray-700 hover:border-pink-200 hover:text-pink-600"
          }`}
          aria-pressed={showFavoritesOnly}
          aria-label={favoritesFilterAriaLabel(
            showFavoritesOnly,
            favoriteCount,
            partnerFavoritesDisplay.label,
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            aria-hidden
            fill={showFavoritesOnly ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          {partnerFavoritesDisplay.label}
          {favoriteCount > 0 ? ` ${favoriteCount}` : ""}
        </button>
      ) : null}
      {showPartnerSort && (
        <>
          {(settings.partner_sort_new_enabled ?? true) && (
            <button
              type="button"
              onClick={() => {
                setPartnerSort("new");
                setCurrentPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium sm:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                partnerSort === "new"
                  ? "bg-emerald-500 text-white"
                  : "border border-gray-300 bg-white text-gray-700"
              }`}
              aria-pressed={partnerSort === "new"}
            >
              최신순
            </button>
          )}
          {(settings.partner_sort_old_enabled ?? true) && (
            <button
              type="button"
              onClick={() => {
                setPartnerSort("old");
                setCurrentPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium sm:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                partnerSort === "old"
                  ? "bg-emerald-500 text-white"
                  : "border border-gray-300 bg-white text-gray-700"
              }`}
              aria-pressed={partnerSort === "old"}
            >
              오래된순
            </button>
          )}
          {(settings.partner_sort_recommended_enabled ?? true) && (
            <button
              type="button"
              onClick={() => {
                setPartnerSort("recommended");
                setCurrentPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium sm:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                partnerSort === "recommended"
                  ? "bg-emerald-500 text-white"
                  : "border border-gray-300 bg-white text-gray-700"
              }`}
              aria-pressed={partnerSort === "recommended"}
            >
              추천순
            </button>
          )}
        </>
      )}
      {partnerListRefreshEnabled && (
        <button
          type="button"
          onClick={() => void loadPartners({ silent: true })}
          disabled={partnersRefreshing || loading}
          className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 sm:text-sm"
        >
          {partnersRefreshing ? "새로고침 중..." : "새로고침"}
        </button>
      )}
    </>
  );

  const categorySection = showCategoryRegionSection ? (
    <section className="partner-category-section mb-6 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <div className="partner-category-grid gap-2.5 sm:gap-3">
        {categoryOptions.map((category) => {
          const isSelected = selectedCategory === category;

          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={[
                "partner-category-chip rounded-xl px-2 py-2.5 text-xs font-medium transition sm:px-3 sm:text-sm",
                isSelected
                  ? "partner-category-chip--selected bg-emerald-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              ].join(" ")}
            >
              {category}
            </button>
          );
        })}
      </div>

      {regionFilterEnabled ? (
        <PartnerRegionFilterPanel
          groups={regionGroups}
          value={selectedRegions}
          onChange={setSelectedRegions}
          defaultExpanded={regionFilterDefaultExpanded}
          partners={partners}
        />
      ) : null}
    </section>
  ) : null;

  const mainMapPanel =
    mainPartnerMapDisplay.enabled && !loading ? (
    <MapEventMapSection
      partners={sortedMapPartners}
      title={mainPartnerMapDisplay.title}
      defaultExpanded={mainPartnerMapDisplay.defaultExpanded}
      onPartnerSelect={(partnerId) => setSelectedPartnerId(partnerId)}
      favoritesEnabled={partnerFavoritesEnabled}
      favoritePartnerIds={favoriteIds}
      locateEnabled={settings.partner_map_locate_enabled ?? true}
      holdLoadingOverlay={pwaHoldMapLoading}
      onMapReady={handleMainMapReady}
      onFavoriteToggle={togglePartnerFavorite}
      favoritesTerm={partnerFavoritesDisplay.label}
      markerSettings={mapMarkerSettings}
    />
  ) : null;

  const renderSelectedPartnerDetail = (closeLabel: string, options?: { splitLayout?: boolean }) => {
    if (!selectedPartner) {
      return null;
    }

    return (
      <PartnerDetailView
        key={selectedPartner.id}
        partner={selectedPartner}
        closeLabel={closeLabel}
        detailSectionLabel={partnerDetailDisplay.detailSectionLabel}
        mapSectionLabel={partnerDetailDisplay.mapSectionLabel}
        showLocalFranchiseBadge={Boolean(localFranchiseByPartnerId[selectedPartner.id])}
        onClose={closePartnerPopup}
        favoritesEnabled={partnerFavoritesEnabled}
        favoritesTerm={partnerFavoritesDisplay.label}
        favorited={isFavorite(selectedPartner.id)}
        onFavoriteToggle={() => togglePartnerFavorite(selectedPartner.id)}
        reactionsEnabled={partnerReactionsEnabled}
        reviewsEnabled={partnerReviewsEnabled}
        hiddenReviewDisplay={hiddenReviewDisplay}
        onPartnerReactionChange={handlePartnerReactionChange}
        onPartnerReviewCountChange={handlePartnerReviewCountChange}
        reportReasons={reportReasons}
        reportSuccessSettings={settings}
        locateEnabled={settings.partner_map_locate_enabled ?? true}
        splitLayout={options?.splitLayout ?? false}
      />
    );
  };

  const partnerListToolbar = showPartnerListToolbar ? (
    <div className="partner-list-toolbar site-main-width mx-auto mb-4">
            <div className="partner-list-toolbar__header flex flex-wrap items-start justify-between gap-3">
              <div className="partner-list-toolbar__left flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                {partnerListSummary ? (
                  <p className="shrink-0 text-sm text-gray-500">{partnerListSummary}</p>
                ) : (
                  <span className="flex-1" aria-hidden />
                )}
              </div>
              <div className="partner-list-toolbar__right ml-auto flex flex-col items-end gap-2">
                {yearFilterEnabled && yearOptions.length > 0 ? (
                  <PartnerYearFilterDropdown
                    value={selectedYear}
                    years={yearOptions}
                    onChange={(year) => {
                      setSelectedYear(year);
                      setCurrentPage(1);
                    }}
                  />
                ) : null}
              </div>
            </div>
            {showToolbarSearch || partnerSortControls ? (
              <div
                className={[
                  "partner-list-toolbar__controls-row",
                  isCompactNavViewport ? "partner-list-toolbar__controls-row--mobile-search" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {showToolbarSearch ? (
                  <div
                    className={[
                      "partner-list-toolbar__search-wrap",
                      isCompactNavViewport ? "partner-list-toolbar__search-wrap--mobile" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <SitePartnerSearch
                      showLeadingIcon={!isCompactNavViewport}
                      iconAside={isCompactNavViewport}
                      searchQuery={searchQuery}
                      onSearchQueryChange={setSearchQuery}
                      placeholder={navSearchPlaceholder}
                      inputId={
                        isCompactNavViewport
                          ? "partner-list-search-mobile"
                          : "partner-list-search"
                      }
                      inputClassName="site-top-nav__search partner-list-toolbar__search"
                    />
                  </div>
                ) : null}
                {partnerSortControls ? (
                  <div className="partner-list-toolbar__sort flex flex-wrap items-center justify-end gap-2">
                    {partnerSortControls}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null;

  const partnerListBody = loading ? (
          <LoadingStateDisplay
            message={getPartnersLoadingMessage(settings)}
            imageUrl={getPartnersLoadingImageUrl(settings)}
          />
        ) : sortedPartners.length === 0 ? (
          <div className="site-main-width mx-auto rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">
            {showFavoritesOnly
              ? partnerFavoritesDisplay.emptyMessage
              : "조건에 맞는 제휴 업체가 없습니다."}
          </div>
        ) : (
          <>
            <PartnerPostGrid
              partners={paginatedPartners}
              gridColumns={partnerListLayout.gridColumns}
              benefitMinHeightMobile={partnerListLayout.benefitMinHeightMobile}
              benefitMinHeightDesktop={partnerListLayout.benefitMinHeightDesktop}
              benefitBoxBgColor={settings.partner_benefit_box_bg_color}
              benefitBoxBorderColor={settings.partner_benefit_box_border_color}
              businessInfoDefaultExpanded={settings.partner_business_info_default_expanded ?? false}
              reactionsEnabled={partnerReactionsEnabled}
              reviewsEnabled={partnerReviewsEnabled}
              hiddenReviewDisplay={hiddenReviewDisplay}
              detailEnabled={detailPopupEnabled}
              localFranchiseByPartnerId={localFranchiseByPartnerId}
              onPartnerSelect={detailPopupEnabled ? setSelectedPartnerId : undefined}
              onPartnerReactionChange={handlePartnerReactionChange}
              onPartnerReviewCountChange={handlePartnerReviewCountChange}
              favoritesEnabled={partnerFavoritesEnabled}
              favoritesTerm={partnerFavoritesDisplay.label}
              isPartnerFavorite={isFavorite}
              onPartnerFavoriteToggle={togglePartnerFavorite}
              reportReasons={reportReasons}
              reportSuccessSettings={settings}
        selectedPartnerId={detailPopupEnabled ? selectedPartnerId : null}
      />
      <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              scrollTargetId={
                settings.pagination_scroll_top_enabled ?? true
                  ? "partner-list-anchor"
                  : undefined
              }
      />
    </>
  );

  const partnerDetailModal =
    detailPopupEnabled && selectedPartner ? (
      <BoardPostModal
        open
        wide
        backHandlerId="partner-detail-modal"
        wideMaxWidthRem={partnerDetailDisplay.popupMaxWidthRem}
        ariaLabel={`${selectedPartner.name} 상세`}
        onClose={closePartnerPopup}
        onPrevious={goToPreviousPartner}
        onNext={goToNextPartner}
        hasPrevious={partnerPopupNavigation.hasPrevious}
        hasNext={partnerPopupNavigation.hasNext}
        navigationSummary={
          partnerPopupNavigation.total > 0
            ? `${partnerPopupNavigation.index + 1} / ${partnerPopupNavigation.total}`
            : null
        }
        dialogClassName={
          showPartnerTabletSplit ? "board-post-popup-dialog--partner-detail" : ""
        }
      >
        {renderSelectedPartnerDetail("닫기", { splitLayout: showPartnerTabletSplit })}
      </BoardPostModal>
    ) : null;

  const mainContent = (
    <>
      {showSiteMaintenance && (
        <section className="site-maintenance-banner mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 shadow-sm sm:px-6 sm:py-5">
          <p className="text-sm font-semibold text-amber-900 sm:text-base">사이트 점검 안내</p>
          {settings.site_maintenance_image_url && (
            <img
              src={settings.site_maintenance_image_url}
              alt="사이트 점검 안내"
              className="mt-3"
            />
          )}
          {settings.site_maintenance_text?.trim() && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-amber-950 sm:text-base">
              {settings.site_maintenance_text}
            </p>
          )}
        </section>
      )}

      {(settings.notice_text_enabled ?? true) && activeNoticeItems.length > 0 ? (
        <SiteNoticeCarousel
          items={activeNoticeItems}
          defaultBadgeLabel={settings.notice_badge_label}
          textColor={settings.notice_text_color}
          autoEnabled={settings.notice_carousel_auto_enabled ?? false}
          autoIntervalSeconds={normalizeNoticeCarouselAutoInterval(
            settings.notice_carousel_auto_interval_seconds,
          )}
        />
      ) : null}

      {boardInlineEnabled && boardAbovePartners && (
        <BoardSection
          boards={getBoardDefinitions(settings)}
          siteSettings={settings}
          placement="above-partners"
        />
      )}

      {categorySection}
      {mainMapPanel}

      <section id="partner-list-anchor">
        {partnerListToolbar}
        {partnerListBody}
        {partnerDetailModal}
      </section>

      {boardInlineEnabled && !boardAbovePartners && (
        <BoardSection
          boards={getBoardDefinitions(settings)}
          siteSettings={settings}
          placement="below-partners"
        />
      )}
      {hasBottomPcAd && (
        <div className="mt-6">
          <BottomPcAdBanner
            imageUrl={settings.bottom_pc_ad_image_url!}
            linkUrl={settings.bottom_pc_ad_link_url}
            label="PC 하단 광고"
          />
        </div>
      )}

      {hasMobileCategoryAd && (
        <div className="mt-6">
          <MobileAdBanner
            imageUrl={settings.mobile_ad_below_category_image_url!}
            linkUrl={settings.mobile_ad_below_category_link_url}
            label="모바일 하단 광고"
          />
        </div>
      )}
    </>
  );

  const navMenuActions =
    (settings.dark_mode_enabled ?? false) ||
    showPwaAppSettings ||
    (settingsPanelEnabled && !pwaAppSettingsActive) ||
    headerActions ? (
      <>
        {headerActions}
        <DarkModeToggleButton available={settings.dark_mode_enabled ?? false} />
        {showPwaAppSettings ? (
          <SitePwaAppSettingsButton
            settings={settings}
            pushEnabled={settings.site_push_enabled ?? false}
            layout="toolbar"
          />
        ) : null}
        {settingsPanelEnabled && !pwaAppSettingsActive ? (
          <MainBetaSettingsButton
            layout="toolbar"
            settingsPanelEnabled={settingsPanelEnabled}
            darkModeAvailable={settings.dark_mode_enabled ?? false}
            mobilePcModeAvailable={settings.mobile_pc_mode_enabled ?? false}
            fontSizeAvailable={settings.main_font_size_enabled ?? false}
            boardPositionAvailable={
              (settings.main_board_position_enabled ?? false) &&
              (settings.board_main_position_enabled ?? true)
            }
            pageBackgroundAvailable={settings.page_background_enabled ?? false}
            pageBackgroundDefaultEnabled={settings.page_background_default_enabled ?? true}
            navBackgroundToggleAvailable={
              (settings.site_nav_background_enabled ?? false) &&
              (settings.site_nav_background_user_toggle_enabled ?? true) &&
              hasConfiguredSiteNavBackground(settings.site_nav_background_image_url)
            }
            navBackgroundDefaultEnabled={settings.site_nav_background_display_enabled ?? false}
            navFloatingChipsToggleAvailable={
              navFloatingChipsFeatureEnabled &&
              (settings.site_nav_floating_chips_user_toggle_enabled ?? true)
            }
            navFloatingChipsDefaultEnabled={navFloatingChipsFeatureEnabled}
            defaultBoardPosition={
              settings.main_board_position_default === "below" ? "below" : "above"
            }
            categoryRegionToggleAvailable={
              (settings.partner_category_section_enabled ?? true) &&
              (settings.main_category_region_user_toggle_enabled ?? true)
            }
            noticeText={settings.settings_panel_notice_text}
            noticeUrl={settings.settings_panel_notice_url}
            noticeColor={settings.settings_panel_notice_color}
          />
        ) : null}
      </>
    ) : null;

  if (!settingsReady) {
    if (shouldUsePwaLoadingSplash(settings, standaloneMode)) {
      return (
        <div className="min-h-screen site-page-shell">
          <SiteAppBackSettingsSync settings={settings} ready={false} />
          <SiteAppBackLoadingSplashSync active />
          <SitePwaLoadingSplash {...pwaSplashProps} />
        </div>
      );
    }

    return (
      <div className="min-h-screen site-page-shell">
        <SiteFeaturesApplier settings={DEFAULT_SITE_SETTINGS} useUserBetaSettings />
        <LoadingStateDisplay
          message={getSiteLoadingMessage(settings)}
          imageUrl={getSiteLoadingImageUrl(settings)}
          variant="fullscreen"
        />
      </div>
    );
  }

  return (
    <SitePwaInstallProvider settings={settings} settingsReady={settingsReady}>
      <StudentIdProvider
        authDisplay={studentAuthDisplay}
        loginDisplay={memberFeatures.login}
        cardFrames={studentCardFrames}
        cardBrand={studentCardBrand}
        lockGestures={pwaSplashVisible}
      >
      <div
        className={[
          "min-h-screen site-page-shell",
          navBackgroundDarkActive ? "site-page-shell--nav-background-dark" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <SiteFeaturesApplier settings={settings} useUserBetaSettings />
        <SiteFaviconApplier faviconUrl={settings.site_favicon_url} />
        <SitePwaRuntime />
        <SiteAppBackSettingsSync settings={settings} ready={settingsReady} />
        <SiteAppBackLoadingSplashSync active={pwaSplashVisible} />
        {isPwaEnabled(settings) ? (
          <SitePwaFirstRunPermissions
            settings={settings}
            settingsReady={settingsReady}
            appReady={pwaPermissionsReady}
            pushEnabled={settings.site_push_enabled ?? false}
          />
        ) : null}
      <SiteTitleApplier variant="site" siteTitle={settings.site_title} />
      {!showTopNav && navMenuActions ? (
        <SiteTopToolbar>
          {navMenuActions}
        </SiteTopToolbar>
      ) : null}
      {!loading && settingsReady && <SitePopupModal popups={popups} />}
      {!loading && settingsReady && (
        <SiteBrowserGuideBanner settings={settings} iconUrl={browserGuideIconUrl} />
      )}
      {showTopNav ? (
        <SiteTopNav
          brandIconUrl={settings.site_nav_brand_icon_url}
          brandLinkUrl={navBrandLinkUrl}
          brandTitle={settings.site_nav_brand_title}
          brandTitleHidden={settings.site_nav_brand_title_hidden ?? false}
          brandTitleImageUrl={settings.site_nav_brand_title_image_url}
          brandIconHidden={settings.site_nav_brand_icon_hidden ?? false}
          brandChipHidden={settings.site_nav_brand_chip_hidden ?? false}
          brandLinkRefresh={settings.site_nav_brand_link_refresh_enabled ?? false}
          headerTitle={settings.header_title}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          navLinks={visibleNavLinks}
          dropdownLinks={visibleDropdownLinks}
          searchPlaceholder={navSearchPlaceholder}
          onNavAction={handleTopNavAction}
          banner={null}
          backgroundEnabled={navBackgroundActive}
          backgroundImageUrl={settings.site_nav_background_image_url}
          backgroundDarkEnabled={navBackgroundDarkActive}
          backgroundDarkOverlayOpacity={settings.site_nav_background_dark_overlay_opacity}
          floatingChipsEnabled={navFloatingChipsActive}
          stickyEnabled={false}
          searchInTopNav={false}
          searchIconToggle={false}
          hintsEnabled={settings.site_nav_hints_enabled ?? true}
          notifyEnabled={settings.site_nav_notify_enabled ?? true}
          menuActions={navMenuActions}
          menuLeading={
            <>
              <SiteEventsBoardSection
                events={events}
                iconUrl={settings.site_events_icon_url}
                label={settings.site_events_label}
                hint={settings.site_events_hint}
                notifyMessage={settings.site_events_notify_message}
                hintsEnabled={settings.site_nav_hints_enabled ?? true}
                notifyEnabled={settings.site_nav_notify_enabled ?? true}
                reportReasons={reportReasons}
                reportSuccessSettings={settings}
                hiddenCommentDisplay={hiddenReviewDisplay}
              />
              <GiftInboxNavChip hideChip={navHasGiftInbox} />
              <FrameInventoryNavChip
                cardFrames={studentCardFrames}
                hideChip={navHasFrameInventory}
              />
            </>
          }
        />
      ) : null}
      <div className="site-hero-shell">
        {showHeroHeader && (
          <header
            id="site-header"
            className="relative w-full overflow-hidden"
          >
            {hasTitleImage && (
              <div className="site-hero-header-banner">
                {headerBanner}
              </div>
            )}
            {!imageOnlyTitle && showHeroGreenSection && (
              <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 px-4 py-10 text-center text-white sm:px-6 sm:py-14">
                <div className="relative mx-auto max-w-3xl">
                  <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium sm:text-sm">
                    2026 제주한라대학교 제41대 다온 총학생회
                  </span>
                  {showTitleText && (
                    <HeroTitle
                      settings={settings}
                      dropdownLinks={visibleDropdownLinks}
                      brandLinkUrl={navBrandLinkUrl}
                      onNavAction={handleTopNavAction}
                    />
                  )}
                  {showSubText && (
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-emerald-50 sm:text-base">
                      {settings.header_sub}
                    </p>
                  )}
                </div>
              </div>
            )}
          </header>
        )}
      </div>

      {boardPopupOpen ? (
        <BoardPostModal
          open
          wide
          backHandlerId="board-nav-modal"
          wideMaxWidthRem={95}
          ariaLabel="게시판"
          onClose={closeBoardPopup}
        >
          <BoardSection
            boards={getBoardDefinitions(settings)}
            siteSettings={settings}
            placement={boardAbovePartners ? "above-partners" : "below-partners"}
            presentation="popup"
          />
        </BoardPostModal>
      ) : null}

      {hasMobileHeroAd && (
        <div className="site-main-width mx-auto px-4 pt-4 sm:px-6">
          <MobileAdBanner
            imageUrl={settings.mobile_ad_below_hero_image_url!}
            linkUrl={settings.mobile_ad_below_hero_link_url}
            label="모바일 대문 하단 광고"
          />
        </div>
      )}

      <div className="site-main-content-wrap mx-auto flex w-fit max-w-full items-stretch justify-center gap-6 px-4 pb-12 pt-6 sm:px-6">
        {hasLeftAd && (
          <aside className="hidden shrink-0 xl:block">
            <SidebarAd
              imageUrl={settings.sidebar_left_image_url!}
              linkUrl={settings.sidebar_left_link_url}
              label="좌측 광고"
            />
          </aside>
        )}

        <main className="site-main-width site-main-width--xl-fixed w-full min-w-0">
          {mainContent}
        </main>

        {hasRightAd && (
          <aside className="hidden shrink-0 xl:block">
            <SidebarAd
              imageUrl={settings.sidebar_right_image_url!}
              linkUrl={settings.sidebar_right_link_url}
              label="우측 광고"
            />
          </aside>
        )}
      </div>

      {shouldShowSiteFooter(settings.footer_text_enabled, settings) ? (
        <SiteFooter
          footer_text={settings.footer_text}
          footer_link_label={settings.footer_link_label}
          footer_link_url={settings.footer_link_url}
          footer_privacy_policy_url={settings.footer_privacy_policy_url}
          footer_terms_url={settings.footer_terms_url}
          footer_business_line1={settings.footer_business_line1}
          footer_business_line2={settings.footer_business_line2}
          footer_copyright={settings.footer_copyright}
          footer_image_url={settings.footer_image_url}
          footer_image2_url={settings.footer_image2_url}
          footer_text_color={settings.footer_text_color}
          footer_dark_background_enabled={settings.footer_dark_background_enabled}
          footer_social_hints_enabled={settings.footer_social_hints_enabled}
          footer_social_notify_enabled={settings.footer_social_notify_enabled}
          footer_social_links={settings.footer_social_links}
        />
      ) : null}
      <FloatingPageControls
        siteSizeEnabled={
          (settings.main_font_size_enabled ?? false) &&
          (settings.main_site_size_floating_enabled ?? false)
        }
      />
      {pwaSplashVisible ? <SitePwaLoadingSplash {...pwaSplashProps} /> : null}
      </div>
      </StudentIdProvider>
    </SitePwaInstallProvider>
  );
}
