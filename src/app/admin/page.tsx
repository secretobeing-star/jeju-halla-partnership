"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import LinkPreviewSettingsPanel from "@/components/admin/LinkPreviewSettingsPanel";
import SitePwaAdminSection from "@/components/admin/SitePwaAdminSection";
import SiteAdminPwaAdminSection from "@/components/admin/SiteAdminPwaAdminSection";
import BoardAdminPanel from "@/components/admin/BoardAdminPanel";
import BoardReportsAdminPanel from "@/components/admin/BoardReportsAdminPanel";
import BoardDeviceManagementAdminPanel from "@/components/admin/BoardDeviceManagementAdminPanel";
import BoardIpManagementAdminPanel from "@/components/admin/BoardIpManagementAdminPanel";
import BoardDefinitionsAdminPanel from "@/components/admin/BoardDefinitionsAdminPanel";
import PartnerReviewsAdminPanel from "@/components/admin/PartnerReviewsAdminPanel";
import PartnerCategoriesAdminPanel from "@/components/admin/PartnerCategoriesAdminPanel";
import PartnerSearchKeywordsAdminPanel from "@/components/admin/PartnerSearchKeywordsAdminPanel";
import PartnerRegionsAdminPanel from "@/components/admin/PartnerRegionsAdminPanel";
import AdsAdminPanel from "@/components/admin/AdsAdminPanel";
import PopupAdminPanel from "@/components/admin/PopupAdminPanel";
import EventAdminPanel from "@/components/admin/EventAdminPanel";
import EventCommentsAdminPanel from "@/components/admin/EventCommentsAdminPanel";
import BenefitAdminPanel from "@/components/admin/BenefitAdminPanel";
import PartnerTextStyleFields, {
  PartnerTextStylePreview,
} from "@/components/admin/PartnerTextStyleFields";
import BoardSettingsPanel from "@/components/admin/BoardSettingsPanel";
import PartnerMapGeocodeSettingsPanel from "@/components/admin/PartnerMapGeocodeSettingsPanel";
import DeveloperModePanel from "@/components/admin/DeveloperModePanel";
import UserSettingsAdminPanel from "@/components/admin/UserSettingsAdminPanel";
import SiteNoticeFields from "@/components/admin/SiteNoticeFields";
import ErrorPagesAdminPanel from "@/components/admin/ErrorPagesAdminPanel";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import AdminPermissionsPanel from "@/components/admin/AdminPermissionsPanel";
import AdminSidebar, { readStoredAdminNav } from "@/components/admin/AdminSidebar";
import PartnerListSettingsPanel from "@/components/admin/PartnerListSettingsPanel";
import MapEventAdminPanel from "@/components/admin/MapEventAdminPanel";
import Pagination from "@/components/Pagination";
import SiteFeaturesApplier from "@/components/SiteFeaturesApplier";
import SiteFaviconApplier from "@/components/SiteFaviconApplier";
import SiteTitleApplier from "@/components/SiteTitleApplier";
import { adminApiFetch } from "@/lib/admin-api";
import {
  AdminNavKey,
  getAdminNavLabel,
  getAllowedAdminNavKeys,
  hasAdminHeaderSave,
  hasAdminNavAccess,
  isSitePwaNavKey,
  resolveStoredAdminNav,
  ADMIN_PRIMARY_FORM_ATTR,
} from "@/lib/admin-navigation";
import {
  AdminUserAccess,
  createDeveloperFreePassAccess,
  isClientDeveloperFreePassEmail,
} from "@/lib/admin-permissions";
import { getStorageErrorMessage, uploadPartnershipImage, uploadPwaIcon } from "@/lib/storage";
import { DEFAULT_SITE_SETTINGS } from "@/lib/default-site-settings";
import { getSiteNoticeItems } from "@/lib/site-notices";
import { getSiteNavLinks } from "@/lib/site-nav-links";
import SiteNavLinksAdminPanel from "@/components/admin/SiteNavLinksAdminPanel";
import SiteLoginAdminPanel from "@/components/admin/SiteLoginAdminPanel";
import StudentAuthAdminPanel from "@/components/admin/StudentAuthAdminPanel";
import CardFramesAdminPanel from "@/components/admin/CardFramesAdminPanel";
import StudentCardBrandAdminPanel from "@/components/admin/StudentCardBrandAdminPanel";
import StudentRewardsAdminPanel from "@/components/admin/StudentRewardsAdminPanel";
import StudentApplicationLogsAdminPanel from "@/components/admin/StudentApplicationLogsAdminPanel";
import MembersAdminPanel from "@/components/admin/MembersAdminPanel";
import SiteBrowserGuideAdminPanel from "@/components/admin/SiteBrowserGuideAdminPanel";
import SiteNotificationsAdminPanel from "@/components/admin/SiteNotificationsAdminPanel";
import SiteNavDropdownLinksAdminPanel from "@/components/admin/SiteNavDropdownLinksAdminPanel";
import SiteNavBrandAdminSection from "@/components/admin/SiteNavBrandAdminSection";
import SiteNavBackgroundAdminSection from "@/components/admin/SiteNavBackgroundAdminSection";
import { buildSiteSettingsPayload } from "@/lib/site-settings-payload";
import { getBoardDefinitions } from "@/lib/board-definitions";
import SiteFooter from "@/components/SiteFooter";
import FooterSocialLinksListEditor from "@/components/admin/FooterSocialLinksListEditor";
import {
  getPartnerCategories,
  normalizeStoredPartnerCategory,
} from "@/lib/partner-categories";
import { partnerMatchesSearchQuery } from "@/lib/partner-search";
import { getPartnerSearchKeywordGroups } from "@/lib/partner-search-keywords";
import {
  formatPartnerRegion,
  getPartnerRegionGroups,
  parsePartnerRegion,
  PARTNER_REGION_ALL,
  PARTNER_REGION_AREA_LABEL,
  resolveStoredPartnerRegion,
} from "@/lib/partner-regions";
import {
  formatPartnerYearLabel,
  getPartnerYearOptions,
  normalizePartnerPartnershipYearInput,
  resolvePartnerPartnershipYear,
  type PartnerYearFilterValue,
} from "@/lib/partner-partnership-year";
import PartnerCardImage from "@/components/PartnerCardImage";
import PartnerMapRegister from "@/components/PartnerMapRegister";
import { normalizePartnerMapUrl } from "@/lib/partner-map-url";
import {
  getPartnerImageRecommendedLabel,
} from "@/lib/partner-image-size";
import { normalizeAdminPartnersPerPage } from "@/lib/pagination-settings";
import { fetchPartnerPhotos, syncPartnerPhotos } from "@/lib/partner-photos";
import { Partner, SiteSettings, supabase } from "@/lib/supabase";
import { useSupabaseConfigState } from "@/components/SupabaseConfigProvider";

const DEFAULT_SETTINGS = DEFAULT_SITE_SETTINGS;

type PartnerForm = {
  name: string;
  category: string;
  region_city: string;
  region_area: string;
  address: string;
  benefit: string;
  image_url: string | null;
  instagram_url: string;
  benefit_start_date: string;
  benefit_end_date: string;
  partnership_year: string;
  benefit_status_text: string;
  benefit_status_color: string;
  benefit_status_bold: boolean;
  benefit_status_italic: boolean;
  benefit_status_underline: boolean;
  benefit_status_strikethrough: boolean;
  business_info: string;
  detail_description: string;
  benefit_color: string;
  benefit_bold: boolean;
  benefit_italic: boolean;
  benefit_underline: boolean;
  benefit_strikethrough: boolean;
  latitude: number | null;
  longitude: number | null;
  map_url: string;
};

const EMPTY_PARTNER_FORM: PartnerForm = {
  name: "",
  category: "음식점",
  region_city: "",
  region_area: "",
  address: "",
  benefit: "",
  image_url: null,
  instagram_url: "",
  benefit_start_date: "",
  benefit_end_date: "",
  partnership_year: String(new Date().getFullYear()),
  benefit_status_text: "",
  benefit_status_color: "#10b981",
  benefit_status_bold: false,
  benefit_status_italic: false,
  benefit_status_underline: false,
  benefit_status_strikethrough: false,
  business_info: "",
  detail_description: "",
  benefit_color: "#000000",
  benefit_bold: false,
  benefit_italic: false,
  benefit_underline: false,
  benefit_strikethrough: false,
  latitude: null,
  longitude: null,
  map_url: "",
};

type Nav = AdminNavKey;

export default function AdminPage() {
  const { configured: supabaseConfigured, checking: supabaseChecking } =
    useSupabaseConfigState();
  const [session, setSession] = useState<boolean | null>(null);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [adminAccess, setAdminAccess] = useState<AdminUserAccess | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [activeNav, setActiveNav] = useState<Nav>("site-basic");
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [titleImageUploading, setTitleImageUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [pwaIconUploading, setPwaIconUploading] = useState(false);
  const [adminPwaIconUploading, setAdminPwaIconUploading] = useState(false);
  const [pwaLoadingImageUploading, setPwaLoadingImageUploading] = useState(false);
  const [pwaLoadingImageFoldCoverUploading, setPwaLoadingImageFoldCoverUploading] = useState(false);
  const [pwaLoadingImageTabletUploading, setPwaLoadingImageTabletUploading] = useState(false);
  const [pwaLoadingImageTabletUltraUploading, setPwaLoadingImageTabletUltraUploading] =
    useState(false);
  const [loginLogoUploading, setLoginLogoUploading] = useState(false);
  const [studentAuthGuideUploading, setStudentAuthGuideUploading] = useState(false);
  const [cardFrameImageUploadingId, setCardFrameImageUploadingId] = useState<string | null>(
    null,
  );
  const [studentCardSchoolLogoUploading, setStudentCardSchoolLogoUploading] = useState(false);
  const [studentCardCenterImageUploading, setStudentCardCenterImageUploading] = useState(false);
  const [studentCardBackgroundUploading, setStudentCardBackgroundUploading] = useState(false);
  const [navBrandIconUploading, setNavBrandIconUploading] = useState(false);
  const [navBrandTitleImageUploading, setNavBrandTitleImageUploading] = useState(false);
  const [navLinksIconUploadingIndex, setNavLinksIconUploadingIndex] = useState<number | null>(null);
  const [navLinksImageUploadingIndex, setNavLinksImageUploadingIndex] = useState<number | null>(null);
  const [dropdownLinksIconUploadingIndex, setDropdownLinksIconUploadingIndex] = useState<
    number | null
  >(null);
  const [dropdownLinksImageUploadingIndex, setDropdownLinksImageUploadingIndex] = useState<
    number | null
  >(null);
  const [linkPreviewImageUploading, setLinkPreviewImageUploading] = useState(false);
  const [siteLoadingImageUploading, setSiteLoadingImageUploading] = useState(false);
  const [partnersLoadingImageUploading, setPartnersLoadingImageUploading] = useState(false);
  const [maintenanceImageUploading, setMaintenanceImageUploading] = useState(false);
  const [footerImageUploading, setFooterImageUploading] = useState(false);
  const [footerImage2Uploading, setFooterImage2Uploading] = useState(false);
  const [footerSocialIconUploadingIndex, setFooterSocialIconUploadingIndex] = useState<
    number | null
  >(null);
  const [sidebarLeftUploading, setSidebarLeftUploading] = useState(false);
  const [sidebarRightUploading, setSidebarRightUploading] = useState(false);
  const [mobileHeroAdUploading, setMobileHeroAdUploading] = useState(false);
  const [mobileCategoryAdUploading, setMobileCategoryAdUploading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [currentOrigin, setCurrentOrigin] = useState<string | null>(null);

  useEffect(() => {
    setCurrentOrigin(window.location.origin);
  }, []);

  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnerForm, setPartnerForm] = useState<PartnerForm>(EMPTY_PARTNER_FORM);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [shopImageUploading, setShopImageUploading] = useState(false);
  const [partnerExtraPhotos, setPartnerExtraPhotos] = useState<string[]>([]);
  const [partnerPhotosUploading, setPartnerPhotosUploading] = useState(false);
  const [partnerSaving, setPartnerSaving] = useState(false);
  const [partnerMessage, setPartnerMessage] = useState("");
  const [partnerListSearch, setPartnerListSearch] = useState("");
  const [partnerListYear, setPartnerListYear] = useState<PartnerYearFilterValue>("전체");
  const [partnerListPage, setPartnerListPage] = useState(1);

  const allowedNavKeys = useMemo(() => getAllowedAdminNavKeys(adminAccess), [adminAccess]);
  const partnerCategories = useMemo(
    () => getPartnerCategories(settings),
    [settings.partner_categories],
  );
  const searchKeywordGroups = useMemo(
    () => getPartnerSearchKeywordGroups(settings),
    [settings.partner_search_keyword_groups],
  );
  const partnerRegions = useMemo(
    () => getPartnerRegionGroups(settings),
    [settings.partner_regions],
  );

  const loadAdminAccess = useCallback(async () => {
    setAccessLoading(true);
    setAccessError("");

    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData.session?.user;

    if (sessionUser?.email && isClientDeveloperFreePassEmail(sessionUser.email)) {
      setAdminAccess(
        createDeveloperFreePassAccess(sessionUser.id, sessionUser.email),
      );
      setAccessLoading(false);

      void adminApiFetch("/api/admin/permissions").catch(() => undefined);
      return;
    }

    try {
      const payload = (await adminApiFetch("/api/admin/permissions")) as {
        access: AdminUserAccess;
      };
      setAdminAccess(payload.access);
    } catch (error) {
      setAdminAccess(null);
      setAccessError(
        error instanceof Error
          ? error.message
          : "관리자 권한 정보를 불러오지 못했습니다.",
      );
    } finally {
      setAccessLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (data) {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...data,
        board_definitions: getBoardDefinitions(data),
        partner_categories: getPartnerCategories(data),
        partner_search_keyword_groups: getPartnerSearchKeywordGroups(data),
        notice_items: getSiteNoticeItems(data),
        site_nav_links: getSiteNavLinks(data),
      });
    }
  }, []);

  const loadPartners = useCallback(async () => {
    setPartnersLoading(true);
    const { data } = await supabase
      .from("partners")
      .select("*")
      .order("name");

    if (data) {
      setPartners(data as Partner[]);
    }
    setPartnersLoading(false);
  }, []);

  useEffect(() => {
    if (supabaseChecking || supabaseConfigured !== true) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
      setLoggedInEmail(data.session?.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, authSession) => {
      setSession(!!authSession);
      setLoggedInEmail(authSession?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabaseChecking, supabaseConfigured]);

  useEffect(() => {
    if (session) {
      void loadAdminAccess();
      loadSettings();
      loadPartners();
    }
  }, [session, loadAdminAccess, loadSettings, loadPartners]);

  useEffect(() => {
    if (!adminAccess || allowedNavKeys.length === 0) {
      return;
    }

    setActiveNav((current) => {
      if (allowedNavKeys.includes(current)) {
        return current;
      }

      return resolveStoredAdminNav(readStoredAdminNav(), adminAccess);
    });
  }, [adminAccess, allowedNavKeys]);

  const filteredPartners = useMemo(() => {
    const query = partnerListSearch.trim().toLowerCase();

    return partners.filter((partner) => {
      if (
        partnerListYear !== "전체" &&
        resolvePartnerPartnershipYear(partner) !== partnerListYear
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return partnerMatchesSearchQuery(partner, query, {
        partnerCategories,
        searchKeywordGroups,
      });
    });
  }, [partners, partnerListSearch, partnerListYear, partnerCategories, searchKeywordGroups]);

  const adminPartnerYearOptions = useMemo(() => getPartnerYearOptions(partners), [partners]);

  const adminPartnersPaginationEnabled =
    settings.admin_partners_list_pagination_enabled ?? false;
  const adminPartnersPerPage = normalizeAdminPartnersPerPage(settings.admin_partners_per_page);
  const partnerListTotalPages = Math.max(
    1,
    Math.ceil(filteredPartners.length / adminPartnersPerPage),
  );

  const displayedPartners = useMemo(() => {
    if (!adminPartnersPaginationEnabled) {
      return filteredPartners;
    }

    const start = (partnerListPage - 1) * adminPartnersPerPage;
    return filteredPartners.slice(start, start + adminPartnersPerPage);
  }, [
    filteredPartners,
    adminPartnersPaginationEnabled,
    adminPartnersPerPage,
    partnerListPage,
  ]);

  useEffect(() => {
    setPartnerListPage(1);
  }, [partnerListSearch, partnerListYear, adminPartnersPaginationEnabled, adminPartnersPerPage]);

  useEffect(() => {
    if (partnerListPage > partnerListTotalPages) {
      setPartnerListPage(partnerListTotalPages);
    }
  }, [partnerListPage, partnerListTotalPages]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(
        error.message === "Failed to fetch" || error.message.includes("fetch")
          ? "Supabase 서버에 연결하지 못했습니다. Vercel 환경 변수(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) 설정 후 재배포했는지 확인해 주세요."
          : error.message,
      );
    }

    setAuthLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function saveSettingsToDb(next: SiteSettings) {
    return supabase.from("site_settings").upsert(buildSiteSettingsPayload(next));
  }

  async function handleMobileAdUpload(
    slot: "hero" | "category",
    file: File,
  ) {
    const setUploading =
      slot === "hero" ? setMobileHeroAdUploading : setMobileCategoryAdUploading;
    setUploading(true);
    setSettingsMessage("");

    try {
      const folder = slot === "hero" ? "ads-mobile-hero" : "ads-mobile-category";
      const url = await uploadPartnershipImage(file, folder);
      const imageKey =
        slot === "hero"
          ? "mobile_ad_below_hero_image_url"
          : "mobile_ad_below_category_image_url";
      const nextSettings = { ...settings, [imageKey]: url };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(
          `${slot === "hero" ? "대문 하단" : "분류 하단"} 모바일 광고 저장 실패: ${error.message}`,
        );
        return;
      }

      setSettingsMessage(
        `${slot === "hero" ? "대문 하단" : "분류 하단"} 모바일 광고가 저장되었습니다.`,
      );
    } catch (error) {
      setSettingsMessage(
        `모바일 광고 업로드 실패: ${getStorageErrorMessage(error)}`,
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleClearMobileAd(slot: "hero" | "category") {
    const imageKey =
      slot === "hero"
        ? "mobile_ad_below_hero_image_url"
        : "mobile_ad_below_category_image_url";
    const linkKey =
      slot === "hero"
        ? "mobile_ad_below_hero_link_url"
        : "mobile_ad_below_category_link_url";
    const nextSettings = {
      ...settings,
      [imageKey]: null,
      [linkKey]: null,
    };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error
        ? `삭제 실패: ${error.message}`
        : `${slot === "hero" ? "대문 하단" : "분류 하단"} 모바일 광고가 삭제되었습니다.`,
    );
  }

  async function handleClearTitleImage() {
    const nextSettings = { ...settings, banner_image_url: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "메인 타이틀 이미지가 삭제되었습니다.",
    );
  }

  async function handleMaintenanceImageUpload(file: File) {
    setMaintenanceImageUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "maintenance");
      const nextSettings = { ...settings, site_maintenance_image_url: url };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`사이트 점검 이미지 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("사이트 점검 이미지가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(
        `사이트 점검 이미지 업로드 실패: ${getStorageErrorMessage(error)}`,
      );
    } finally {
      setMaintenanceImageUploading(false);
    }
  }

  async function handleClearMaintenanceImage() {
    const nextSettings = { ...settings, site_maintenance_image_url: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "사이트 점검 이미지가 삭제되었습니다.",
    );
  }

  async function handleFooterImageUpload(file: File) {
    setFooterImageUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "footer");
      const nextSettings = { ...settings, footer_image_url: url };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`하단 이미지 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("하단 이미지 1이 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`하단 이미지 1 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setFooterImageUploading(false);
    }
  }

  async function handleClearFooterImage() {
    const nextSettings = { ...settings, footer_image_url: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "하단 이미지 1이 삭제되었습니다.",
    );
  }

  async function handleFooterImage2Upload(file: File) {
    setFooterImage2Uploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "footer-2");
      const nextSettings = { ...settings, footer_image2_url: url };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`하단 이미지 2 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("하단 이미지 2가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`하단 이미지 2 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setFooterImage2Uploading(false);
    }
  }

  async function handleClearFooterImage2() {
    const nextSettings = { ...settings, footer_image2_url: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "하단 이미지 2가 삭제되었습니다.",
    );
  }

  async function handleFooterSocialIconUpload(index: number, file: File) {
    setFooterSocialIconUploadingIndex(index);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "footer-social-icons");
      let nextSettings: SiteSettings | null = null;

      setSettings((prev) => {
        const items = [...(prev.footer_social_links ?? [])];
        if (!items[index]) {
          return prev;
        }

        items[index] = { ...items[index], icon_url: url };
        nextSettings = { ...prev, footer_social_links: items };
        return nextSettings;
      });

      if (!nextSettings) {
        setSettingsMessage("아이콘 링크를 찾을 수 없습니다.");
        return;
      }

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`하단 아이콘 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("하단 아이콘이 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`하단 아이콘 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setFooterSocialIconUploadingIndex(null);
    }
  }

  async function handleSiteLoadingImageUpload(file: File) {
    setSiteLoadingImageUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "loading");
      const nextSettings = { ...settings, site_loading_image_url: url };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`사이트 로딩 이미지 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("사이트 로딩 이미지가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`사이트 로딩 이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setSiteLoadingImageUploading(false);
    }
  }

  async function handleClearSiteLoadingImage() {
    const nextSettings = { ...settings, site_loading_image_url: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "사이트 로딩 이미지가 삭제되었습니다.",
    );
  }

  async function handlePartnersLoadingImageUpload(file: File) {
    setPartnersLoadingImageUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "loading");
      const nextSettings = { ...settings, partners_loading_image_url: url };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`제휴 업체 로딩 이미지 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("제휴 업체 로딩 이미지가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(
        `제휴 업체 로딩 이미지 업로드 실패: ${getStorageErrorMessage(error)}`,
      );
    } finally {
      setPartnersLoadingImageUploading(false);
    }
  }

  async function handleClearPartnersLoadingImage() {
    const nextSettings = { ...settings, partners_loading_image_url: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "제휴 업체 로딩 이미지가 삭제되었습니다.",
    );
  }

  async function handleSidebarAdUpload(side: "left" | "right", file: File) {
    const setUploading =
      side === "left" ? setSidebarLeftUploading : setSidebarRightUploading;
    setUploading(true);
    setSettingsMessage("");

    try {
      const folder = side === "left" ? "ads-left" : "ads-right";
      const url = await uploadPartnershipImage(file, folder);
      const imageKey =
        side === "left" ? "sidebar_left_image_url" : "sidebar_right_image_url";
      const nextSettings = { ...settings, [imageKey]: url };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(
          `${side === "left" ? "좌측" : "우측"} 광고 업로드 후 저장 실패: ${error.message}`,
        );
        return;
      }

      setSettingsMessage(
        `${side === "left" ? "좌측" : "우측"} 광고 이미지가 저장되었습니다.`,
      );
    } catch (error) {
      setSettingsMessage(
        `${side === "left" ? "좌측" : "우측"} 광고 업로드 실패: ${getStorageErrorMessage(error)}`,
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleClearSidebarAd(side: "left" | "right") {
    const imageKey =
      side === "left" ? "sidebar_left_image_url" : "sidebar_right_image_url";
    const linkKey =
      side === "left" ? "sidebar_left_link_url" : "sidebar_right_link_url";
    const nextSettings = {
      ...settings,
      [imageKey]: null,
      [linkKey]: null,
    };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error
        ? `삭제 실패: ${error.message}`
        : `${side === "left" ? "좌측" : "우측"} 광고가 삭제되었습니다.`,
    );
  }

  async function handleTitleImageUpload(file: File) {
    setTitleImageUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "banners");
      const nextSettings = {
        ...settings,
        banner_image_url: url,
        banner_image_enabled: true,
      };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`메인 타이틀 이미지 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("메인 타이틀 이미지가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(
        `메인 타이틀 이미지 업로드 실패: ${getStorageErrorMessage(error)}`,
      );
    } finally {
      setTitleImageUploading(false);
    }
  }

  async function handleFaviconUpload(file: File) {
    setFaviconUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "favicon");
      const nextSettings = { ...settings, site_favicon_url: url };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`사이트 아이콘 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("사이트 아이콘이 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`사이트 아이콘 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setFaviconUploading(false);
    }
  }

  async function handleClearFavicon() {
    const nextSettings = { ...settings, site_favicon_url: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "사이트 아이콘이 삭제되었습니다.",
    );
  }

  async function handlePwaIconUpload(file: File) {
    setPwaIconUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPwaIcon(file);
      const nextSettings = { ...settings, site_pwa_icon_url: url };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`PWA 아이콘 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("PWA 앱 아이콘이 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`PWA 아이콘 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setPwaIconUploading(false);
    }
  }

  async function handleClearPwaIcon() {
    const nextSettings = { ...settings, site_pwa_icon_url: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "PWA 앱 아이콘이 삭제되었습니다.",
    );
  }

  async function handleAdminPwaIconUpload(file: File) {
    setAdminPwaIconUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPwaIcon(file);
      const nextSettings = { ...settings, site_admin_pwa_icon_url: url };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`관리자 PWA 아이콘 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("관리자 PWA 앱 아이콘이 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(
        `관리자 PWA 아이콘 업로드 실패: ${getStorageErrorMessage(error)}`,
      );
    } finally {
      setAdminPwaIconUploading(false);
    }
  }

  async function handleClearAdminPwaIcon() {
    const nextSettings = { ...settings, site_admin_pwa_icon_url: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "관리자 PWA 앱 아이콘이 삭제되었습니다.",
    );
  }

  async function handlePwaLoadingImageUpload(file: File) {
    setPwaLoadingImageUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "loading");
      const nextSettings = {
        ...settings,
        site_pwa_loading_image_url: url,
        site_pwa_loading_image_fullscreen: true,
      };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`PWA 로딩 이미지 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("PWA 로딩 이미지가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`PWA 로딩 이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setPwaLoadingImageUploading(false);
    }
  }

  async function handleClearPwaLoadingImage() {
    const nextSettings = { ...settings, site_pwa_loading_image_url: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "PWA 로딩 이미지가 삭제되었습니다.",
    );
  }

  async function handlePwaLoadingImageTabletUpload(file: File) {
    setPwaLoadingImageTabletUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "loading-tablet");
      const nextSettings = {
        ...settings,
        site_pwa_loading_image_url_tablet: url,
      };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`PWA 태블릿 로딩 이미지 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("PWA 태블릿 로딩 이미지가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`PWA 태블릿 로딩 이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setPwaLoadingImageTabletUploading(false);
    }
  }

  async function handleClearPwaLoadingImageTablet() {
    const nextSettings = { ...settings, site_pwa_loading_image_url_tablet: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "PWA 태블릿 로딩 이미지가 삭제되었습니다.",
    );
  }

  async function handlePwaLoadingImageFoldCoverUpload(file: File) {
    setPwaLoadingImageFoldCoverUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "loading-fold-cover");
      const nextSettings = {
        ...settings,
        site_pwa_loading_image_url_fold_cover: url,
      };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`Fold8 커버 로딩 이미지 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("Fold8 커버 로딩 이미지가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`Fold8 커버 로딩 이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setPwaLoadingImageFoldCoverUploading(false);
    }
  }

  async function handleClearPwaLoadingImageFoldCover() {
    const nextSettings = { ...settings, site_pwa_loading_image_url_fold_cover: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "Fold8 커버 로딩 이미지가 삭제되었습니다.",
    );
  }

  async function handlePwaLoadingImageTabletUltraUpload(file: File) {
    setPwaLoadingImageTabletUltraUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "loading-tablet-ultra");
      const nextSettings = {
        ...settings,
        site_pwa_loading_image_url_tablet_ultra: url,
      };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`Fold8 Ultra 로딩 이미지 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("Fold8 Ultra 로딩 이미지가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`Fold8 Ultra 로딩 이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setPwaLoadingImageTabletUltraUploading(false);
    }
  }

  async function handleClearPwaLoadingImageTabletUltra() {
    const nextSettings = { ...settings, site_pwa_loading_image_url_tablet_ultra: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "Fold8 Ultra 로딩 이미지가 삭제되었습니다.",
    );
  }

  async function handleLoginLogoUpload(file: File) {
    setLoginLogoUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "login-logo");
      const nextSettings = { ...settings, site_login_logo_url: url };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`로그인 로고 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("로그인 로고가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`로그인 로고 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setLoginLogoUploading(false);
    }
  }

  async function handleClearLoginLogo() {
    const nextSettings = { ...settings, site_login_logo_url: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "로그인 로고가 삭제되었습니다.",
    );
  }

  async function handleStudentAuthGuideImageUpload(file: File) {
    setStudentAuthGuideUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "student-auth-guide");
      const nextSettings = { ...settings, site_student_auth_guide_image_url: url };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`인증 안내 이미지 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("인증 안내 이미지가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`인증 안내 이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setStudentAuthGuideUploading(false);
    }
  }

  async function handleClearStudentAuthGuideImage() {
    const nextSettings = { ...settings, site_student_auth_guide_image_url: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "인증 안내 이미지가 삭제되었습니다.",
    );
  }

  async function handleCardFrameImageUpload(frameId: string, file: File) {
    setCardFrameImageUploadingId(frameId);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "student-card-frames");
      const { resolveCardFrameCatalog } = await import("@/lib/student-card-frames");
      const catalog = resolveCardFrameCatalog(settings.site_student_card_frames);
      const nextFrames = catalog.map((item) =>
        item.id === frameId ? { ...item, imageUrl: url } : item,
      );
      const nextSettings = { ...settings, site_student_card_frames: nextFrames };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);
      if (error) {
        setSettingsMessage(`코스튬 이미지 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("코스튬 이미지가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`코스튬 이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setCardFrameImageUploadingId(null);
    }
  }

  async function handleStudentCardSchoolLogoUpload(file: File) {
    setStudentCardSchoolLogoUploading(true);
    setSettingsMessage("");
    try {
      const url = await uploadPartnershipImage(file, "student-card-brand");
      const nextSettings = { ...settings, site_student_card_school_logo_url: url };
      setSettings(nextSettings);
      const { error } = await saveSettingsToDb(nextSettings);
      setSettingsMessage(
        error
          ? `학교 로고 업로드 후 저장 실패: ${error.message}`
          : "학교 로고가 업로드되어 저장되었습니다.",
      );
    } catch (error) {
      setSettingsMessage(`학교 로고 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setStudentCardSchoolLogoUploading(false);
    }
  }

  async function handleClearStudentCardSchoolLogo() {
    const nextSettings = { ...settings, site_student_card_school_logo_url: null };
    setSettings(nextSettings);
    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(error ? `삭제 실패: ${error.message}` : "학교 로고가 삭제되었습니다.");
  }

  async function handleStudentCardCenterImageUpload(file: File) {
    setStudentCardCenterImageUploading(true);
    setSettingsMessage("");
    try {
      const url = await uploadPartnershipImage(file, "student-card-brand");
      const nextSettings = { ...settings, site_student_card_center_image_url: url };
      setSettings(nextSettings);
      const { error } = await saveSettingsToDb(nextSettings);
      setSettingsMessage(
        error
          ? `중앙 이미지 업로드 후 저장 실패: ${error.message}`
          : "중앙 이미지가 업로드되어 저장되었습니다.",
      );
    } catch (error) {
      setSettingsMessage(`중앙 이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setStudentCardCenterImageUploading(false);
    }
  }

  async function handleClearStudentCardCenterImage() {
    const nextSettings = { ...settings, site_student_card_center_image_url: null };
    setSettings(nextSettings);
    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(error ? `삭제 실패: ${error.message}` : "중앙 이미지가 삭제되었습니다.");
  }

  async function handleStudentCardBackgroundUpload(file: File) {
    setStudentCardBackgroundUploading(true);
    setSettingsMessage("");
    try {
      const url = await uploadPartnershipImage(file, "student-card-brand");
      const nextSettings = { ...settings, site_student_card_background_url: url };
      setSettings(nextSettings);
      const { error } = await saveSettingsToDb(nextSettings);
      setSettingsMessage(
        error
          ? `뒷배경 업로드 후 저장 실패: ${error.message}`
          : "학생증 뒷배경이 업로드되어 저장되었습니다.",
      );
    } catch (error) {
      setSettingsMessage(`뒷배경 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setStudentCardBackgroundUploading(false);
    }
  }

  async function handleClearStudentCardBackground() {
    const nextSettings = { ...settings, site_student_card_background_url: null };
    setSettings(nextSettings);
    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(error ? `삭제 실패: ${error.message}` : "학생증 뒷배경이 삭제되었습니다.");
  }

  async function handleNavBrandIconUpload(file: File) {
    setNavBrandIconUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "nav-brand");
      const nextSettings = { ...settings, site_nav_brand_icon_url: url };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`상단 로고 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("상단 로고가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`상단 로고 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setNavBrandIconUploading(false);
    }
  }

  async function handleClearNavBrandIcon() {
    const nextSettings = { ...settings, site_nav_brand_icon_url: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "상단 로고가 삭제되었습니다.",
    );
  }

  async function handleNavBrandTitleImageUpload(file: File) {
    setNavBrandTitleImageUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "nav-brand-title");
      const nextSettings = { ...settings, site_nav_brand_title_image_url: url };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`제목 이미지 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("상단 제목 이미지가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`제목 이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setNavBrandTitleImageUploading(false);
    }
  }

  async function handleClearNavBrandTitleImage() {
    const nextSettings = { ...settings, site_nav_brand_title_image_url: null };
    setSettings(nextSettings);

    const { error } = await saveSettingsToDb(nextSettings);
    setSettingsMessage(
      error ? `삭제 실패: ${error.message}` : "상단 제목 이미지가 삭제되었습니다.",
    );
  }

  async function handleNavLinksIconUpload(index: number, file: File) {
    setNavLinksIconUploadingIndex(index);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "nav-menu-icons");
      let nextSettings: SiteSettings | null = null;

      setSettings((prev) => {
        const items = [...(prev.site_nav_links ?? [])];
        if (!items[index]) {
          return prev;
        }

        items[index] = { ...items[index], icon_url: url };
        nextSettings = { ...prev, site_nav_links: items };
        return nextSettings;
      });

      if (!nextSettings) {
        setSettingsMessage("메뉴를 찾을 수 없습니다.");
        return;
      }

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`메뉴 아이콘 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("메뉴 아이콘이 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`메뉴 아이콘 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setNavLinksIconUploadingIndex(null);
    }
  }

  async function handleNavLinksImageUpload(index: number, file: File) {
    setNavLinksImageUploadingIndex(index);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "nav-menu-icons");
      let nextSettings: SiteSettings | null = null;

      setSettings((prev) => {
        const items = [...(prev.site_nav_links ?? [])];
        if (!items[index]) {
          return prev;
        }

        items[index] = { ...items[index], image_url: url };
        nextSettings = { ...prev, site_nav_links: items };
        return nextSettings;
      });

      if (!nextSettings) {
        setSettingsMessage("메뉴를 찾을 수 없습니다.");
        return;
      }

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`메뉴 이미지 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("메뉴 이미지가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`메뉴 이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setNavLinksImageUploadingIndex(null);
    }
  }

  async function handleDropdownLinksImageUpload(index: number, file: File) {
    setDropdownLinksImageUploadingIndex(index);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "nav-menu-icons");
      let nextSettings: SiteSettings | null = null;

      setSettings((prev) => {
        const items = [...(prev.site_nav_dropdown_links ?? [])];
        if (!items[index]) {
          return prev;
        }

        items[index] = { ...items[index], image_url: url };
        nextSettings = { ...prev, site_nav_dropdown_links: items };
        return nextSettings;
      });

      if (!nextSettings) {
        setSettingsMessage("드롭다운 메뉴를 찾을 수 없습니다.");
        return;
      }

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`드롭다운 이미지 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("드롭다운 메뉴 이미지가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`드롭다운 메뉴 이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setDropdownLinksImageUploadingIndex(null);
    }
  }

  async function handleDropdownLinksIconUpload(index: number, file: File) {
    setDropdownLinksIconUploadingIndex(index);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "nav-menu-icons");
      let nextSettings: SiteSettings | null = null;

      setSettings((prev) => {
        const items = [...(prev.site_nav_dropdown_links ?? [])];
        if (!items[index]) {
          return prev;
        }

        items[index] = { ...items[index], icon_url: url };
        nextSettings = { ...prev, site_nav_dropdown_links: items };
        return nextSettings;
      });

      if (!nextSettings) {
        setSettingsMessage("드롭다운 메뉴를 찾을 수 없습니다.");
        return;
      }

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`드롭다운 아이콘 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("드롭다운 아이콘이 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(`드롭다운 아이콘 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setDropdownLinksIconUploadingIndex(null);
    }
  }

  async function handleLinkPreviewImageUpload(file: File) {
    setLinkPreviewImageUploading(true);
    setSettingsMessage("");

    try {
      const url = await uploadPartnershipImage(file, "link-preview");
      const nextSettings = { ...settings, link_preview_image_url: url };
      setSettings(nextSettings);

      const { error } = await saveSettingsToDb(nextSettings);

      if (error) {
        setSettingsMessage(`링크 미리보기 이미지 업로드 후 저장 실패: ${error.message}`);
        return;
      }

      setSettingsMessage("링크 미리보기 이미지가 업로드되어 저장되었습니다.");
    } catch (error) {
      setSettingsMessage(
        `링크 미리보기 이미지 업로드 실패: ${getStorageErrorMessage(error)}`,
      );
    } finally {
      setLinkPreviewImageUploading(false);
    }
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsMessage("");

    const { error } = await saveSettingsToDb(settings);

    setSettingsMessage(
      error ? `저장에 실패했습니다: ${error.message}` : "설정이 저장되었습니다.",
    );
    if (!error && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("site-settings-saved"));
    }
    setSettingsSaving(false);
  }

  function handleHeaderSave() {
    document
      .querySelectorAll<HTMLFormElement>(`.admin-content__inner [${ADMIN_PRIMARY_FORM_ATTR}]`)
      .forEach((form) => {
        form.requestSubmit();
      });
  }

  const headerSaveDisabled =
    settingsSaving ||
    (activeNav === "partners" && partnerSaving);

  async function handleShopImageUpload(file: File) {
    setShopImageUploading(true);
    setPartnerMessage("");

    try {
      const url = await uploadPartnershipImage(file, "shops");
      setPartnerForm((prev) => ({ ...prev, image_url: url }));
      setPartnerMessage("업체 대표 사진이 업로드되었습니다.");
    } catch (error) {
      setPartnerMessage(`업체 사진 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setShopImageUploading(false);
    }
  }

  async function handlePartnerExtraPhotosUpload(files: FileList | File[]) {
    const fileArray = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (fileArray.length === 0) {
      return;
    }

    setPartnerPhotosUploading(true);
    setPartnerMessage("");

    try {
      const uploadedUrls: string[] = [];
      for (const file of fileArray) {
        uploadedUrls.push(await uploadPartnershipImage(file, "shops"));
      }
      setPartnerExtraPhotos((prev) => [...prev, ...uploadedUrls]);
      setPartnerMessage(`추가 사진 ${uploadedUrls.length}장이 업로드되었습니다.`);
    } catch (error) {
      setPartnerMessage(`추가 사진 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setPartnerPhotosUploading(false);
    }
  }

  function removePartnerExtraPhoto(index: number) {
    setPartnerExtraPhotos((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  async function startEditPartner(partner: Partner) {
    setEditingPartnerId(partner.id);
    const resolvedRegion = resolveStoredPartnerRegion(partner.region, partnerRegions);
    setPartnerForm({
      name: partner.name,
      category: normalizeStoredPartnerCategory(partner.category, partnerCategories),
      region_city: resolvedRegion.city,
      region_area:
        resolvedRegion.area === PARTNER_REGION_ALL ? "" : resolvedRegion.area,
      address: partner.address,
      benefit: partner.benefit,
      image_url: partner.image_url,
      instagram_url: partner.instagram_url ?? "",
      benefit_start_date: partner.benefit_start_date ?? "",
      benefit_end_date: partner.benefit_end_date ?? "",
      partnership_year:
        partner.partnership_year != null
          ? String(partner.partnership_year)
          : String(resolvePartnerPartnershipYear(partner)),
      benefit_status_text: partner.benefit_status_text ?? "",
      benefit_status_color: partner.benefit_status_color ?? "#10b981",
      benefit_status_bold: partner.benefit_status_bold ?? false,
      benefit_status_italic: partner.benefit_status_italic ?? false,
      benefit_status_underline: partner.benefit_status_underline ?? false,
      benefit_status_strikethrough: partner.benefit_status_strikethrough ?? false,
      business_info: partner.business_info ?? "",
      detail_description: partner.detail_description ?? "",
      benefit_color: partner.benefit_color ?? "#000000",
      benefit_bold: partner.benefit_bold ?? false,
      benefit_italic: partner.benefit_italic ?? false,
      benefit_underline: partner.benefit_underline ?? false,
      benefit_strikethrough: partner.benefit_strikethrough ?? false,
      latitude: partner.latitude ?? null,
      longitude: partner.longitude ?? null,
      map_url: partner.map_url ?? "",
    });
    setPartnerExtraPhotos([]);
    const photos = await fetchPartnerPhotos(partner.id);
    setPartnerExtraPhotos(photos.map((photo) => photo.image_url));
    setPartnerMessage("");
    setActiveNav("partners");
  }

  function cancelEditPartner() {
    setEditingPartnerId(null);
    setPartnerForm(EMPTY_PARTNER_FORM);
    setPartnerExtraPhotos([]);
    setPartnerMessage("");
  }

  async function handlePartnerSubmit(e: FormEvent) {
    e.preventDefault();
    setPartnerSaving(true);
    setPartnerMessage("");

    const payload = {
      name: partnerForm.name.trim(),
      category: partnerForm.category,
      region: formatPartnerRegion(partnerForm.region_city, partnerForm.region_area),
      address: partnerForm.address.trim(),
      benefit: partnerForm.benefit.replace(/\r\n/g, "\n").trim(),
      image_url: partnerForm.image_url,
      instagram_url: partnerForm.instagram_url.trim() || null,
      benefit_start_date: partnerForm.benefit_start_date || null,
      benefit_end_date: partnerForm.benefit_end_date || null,
      partnership_year: normalizePartnerPartnershipYearInput(partnerForm.partnership_year),
      benefit_status_text: partnerForm.benefit_status_text.trim() || null,
      benefit_status_color: partnerForm.benefit_status_text.trim()
        ? partnerForm.benefit_status_color.trim() || null
        : null,
      benefit_status_bold: partnerForm.benefit_status_bold,
      benefit_status_italic: partnerForm.benefit_status_italic,
      benefit_status_underline: partnerForm.benefit_status_underline,
      benefit_status_strikethrough: partnerForm.benefit_status_strikethrough,
      business_info: partnerForm.business_info.replace(/\r\n/g, "\n").trim() || null,
      detail_description: partnerForm.detail_description.replace(/\r\n/g, "\n").trim() || null,
      benefit_color: partnerForm.benefit_color.trim() || null,
      benefit_bold: partnerForm.benefit_bold,
      benefit_italic: partnerForm.benefit_italic,
      benefit_underline: partnerForm.benefit_underline,
      benefit_strikethrough: partnerForm.benefit_strikethrough,
      latitude: partnerForm.latitude,
      longitude: partnerForm.longitude,
      map_url: partnerForm.map_url.trim()
        ? normalizePartnerMapUrl(partnerForm.map_url.trim())
        : null,
      is_active: true,
    };

    const { data: insertedPartner, error } = editingPartnerId
      ? await supabase
          .from("partners")
          .update(payload)
          .eq("id", editingPartnerId)
          .select("id")
          .maybeSingle()
      : await supabase.from("partners").insert(payload).select("id").single();

    const partnerId = editingPartnerId ?? insertedPartner?.id ?? null;

    if (error) {
      const message = error.message.includes("map_url")
        ? "저장 실패: 지도 링크 컬럼이 없습니다. Supabase SQL Editor에서 supabase/partner-map-url.sql을 실행한 뒤 다시 저장해 주세요."
        : error.message.includes("detail_description")
          ? "저장 실패: 상세 설명 컬럼이 없습니다. Supabase SQL Editor에서 supabase/partner-detail-description.sql을 실행한 뒤 다시 저장해 주세요."
            : error.message.includes("benefit_color") ||
              error.message.includes("benefit_bold") ||
              error.message.includes("benefit_italic") ||
              error.message.includes("benefit_underline") ||
              error.message.includes("benefit_strikethrough")
            ? "저장 실패: 혜택 글자 스타일 컬럼이 없습니다. Supabase SQL Editor에서 supabase/partner-benefit-text-style.sql을 실행한 뒤 다시 저장해 주세요."
            : error.message.includes("partnership_year")
              ? "저장 실패: 제휴 연도 컬럼이 없습니다. Supabase SQL Editor에서 supabase/partner-partnership-year.sql을 실행한 뒤 다시 저장해 주세요."
            : "저장에 실패했습니다.";
      setPartnerMessage(message);
    } else if (partnerId) {
      const photoSync = await syncPartnerPhotos(partnerId, partnerExtraPhotos);
      if (!photoSync.ok) {
        setPartnerMessage(photoSync.message);
      } else {
        setPartnerMessage(
          editingPartnerId ? "업체 정보가 수정되었습니다." : "새 업체가 등록되었습니다.",
        );
        cancelEditPartner();
        await loadPartners();
      }
    } else {
      setPartnerMessage("저장에 실패했습니다.");
    }

    setPartnerSaving(false);
  }

  async function togglePartnerActive(partner: Partner) {
    const { error } = await supabase
      .from("partners")
      .update({ is_active: !partner.is_active })
      .eq("id", partner.id);

    if (!error) {
      setPartners((prev) =>
        prev.map((item) =>
          item.id === partner.id ? { ...item, is_active: !item.is_active } : item,
        ),
      );
    }
  }

  async function deletePartner(id: string) {
    if (!window.confirm("이 제휴 업체를 삭제하시겠습니까?")) {
      return;
    }

    const { error } = await supabase.from("partners").delete().eq("id", id);

    if (error) {
      setPartnerMessage("삭제에 실패했습니다.");
      return;
    }

    if (editingPartnerId === id) {
      cancelEditPartner();
    }

    await loadPartners();
  }

  if (supabaseChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(245,246,248)]">
        <p className="text-gray-500">Supabase 연결 확인 중...</p>
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(245,246,248)]">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(245,246,248)] px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md"
        >
          <h1 className="text-xl font-bold text-gray-900">제주한라대 제휴 관리자</h1>
          <p className="mt-1 text-sm text-gray-500">관리자 계정으로 로그인하세요.</p>

          {!supabaseConfigured && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Supabase 연결 설정이 필요합니다</p>
              <p className="mt-1">
                현재 placeholder 주소로 연결되어 로그인이 불가합니다. Supabase 대시보드 →
                Project Settings → API에서 URL과 anon key를 복사한 뒤, Vercel → Settings →
                Environment Variables에 등록하고 재배포해 주세요.
              </p>
              <p className="mt-2">
                설정 확인:{" "}
                <a
                  href="/api/config-check"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-700 underline"
                >
                  /api/config-check
                </a>
              </p>
            </div>
          )}

          <label className="mt-6 block text-sm font-medium text-gray-700">
            이메일
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-gray-700">
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          {authError && (
            <p className="mt-3 text-sm text-red-600">{authError}</p>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="mt-6 w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {authLoading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    );
  }

  if (accessLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(245,246,248)] px-4">
        <p className="text-sm text-gray-600">관리자 권한을 확인하는 중...</p>
      </div>
    );
  }

  if (!adminAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(245,246,248)] px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <h1 className="text-xl font-bold text-gray-900">관리자 접근 권한 없음</h1>
          <p className="mt-3 text-sm text-gray-600">
            {accessError ||
              "이 계정에는 관리자 권한이 없습니다. 개발자 계정에서 권한을 부여받은 뒤 다시 로그인해 주세요."}
          </p>
          {loggedInEmail && (
            <p className="mt-2 text-xs text-gray-500">
              로그인 계정: <span className="font-medium text-gray-700">{loggedInEmail}</span>
            </p>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(245,246,248)]">
      <SiteFeaturesApplier settings={settings} />
      <SiteFaviconApplier faviconUrl={settings.site_favicon_url} />
      <SiteTitleApplier
        variant="admin"
        adminSiteTitle={settings.admin_site_title}
      />
      <header className="admin-page-header border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
              제주한라대 제휴 시스템 관리자
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <a
                href="/"
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              >
                홈페이지 이동
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                로그아웃
              </button>
            </div>
            {loggedInEmail && (
              <p className="max-w-[240px] truncate text-right text-xs text-gray-500 sm:max-w-none">
                로그인 계정: <span className="font-medium text-gray-700">{loggedInEmail}</span>
                {adminAccess.role === "developer" && (
                  <span className="ml-1 font-medium text-emerald-700">
                    · 개발자{adminAccess.is_free_pass ? " (프리패스)" : ""}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="admin-layout">
        {adminAccess && (
          <AdminSidebar
            activeNav={activeNav}
            adminAccess={adminAccess}
            onSelect={setActiveNav}
          />
        )}

        <div className="admin-content">
          <div className="admin-content__header">
            <h2 className="admin-content__title">{getAdminNavLabel(activeNav)}</h2>
            {hasAdminHeaderSave(activeNav) ? (
              <button
                type="button"
                className="admin-content__save"
                disabled={headerSaveDisabled}
                onClick={handleHeaderSave}
              >
                {headerSaveDisabled ? "저장 중..." : "저장하기"}
              </button>
            ) : null}
          </div>

          <div className="admin-content__inner">
        {hasAdminNavAccess(adminAccess, "site-basic") && activeNav === "site-basic" && (
          <form onSubmit={handleSaveSettings} className="space-y-6" {...{ [ADMIN_PRIMARY_FORM_ATTR]: "" }}>
            <AdminCollapsibleSection
              title="브라우저 탭"
              description="메인·관리자 페이지의 브라우저 탭 제목, 공식 도메인을 설정합니다."
            >
            <label className="block text-sm font-medium text-gray-700">
              사이트 제목 (브라우저 탭)
              <input
                value={settings.site_title ?? ""}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    site_title: e.target.value.trim() ? e.target.value : null,
                  }))
                }
                placeholder="미입력 시 브라우저 탭 제목 없음"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
            <p className="mt-1 text-xs text-gray-500">
              메인 페이지 브라우저 탭 제목입니다. 비우면 탭에 글자가 표시되지 않습니다.
            </p>

            <label className="mt-5 block text-sm font-medium text-gray-700">
              관리자 사이트 제목 (브라우저 탭)
              <input
                value={settings.admin_site_title ?? ""}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    admin_site_title: e.target.value.trim() ? e.target.value : null,
                  }))
                }
                placeholder="미입력 시 브라우저 탭 제목 없음"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
            <p className="mt-1 text-xs text-gray-500">
              관리자 페이지 브라우저 탭 제목입니다. 비우면 탭에 글자가 표시되지 않습니다.
            </p>

            <label className="mt-5 block text-sm font-medium text-gray-700">
              메인 도메인 (공식 사이트 URL)
              <input
                value={settings.main_domain ?? ""}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    main_domain: e.target.value.trim() ? e.target.value : null,
                  }))
                }
                placeholder="https://chu.gg"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
            <p className="mt-1 text-xs text-gray-500">
              SEO·공유용 공식 도메인입니다. 저장 시 https:// 형식으로 자동 정리됩니다.
              실제 접속 주소와 동일한 URL을 입력하세요.
              {currentOrigin ? ` 현재 접속 주소: ${currentOrigin}` : ""}
            </p>
            {settings.main_domain?.trim() && (
              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    main_domain: null,
                  }))
                }
                className="mt-2 text-xs text-red-600 hover:underline"
              >
                메인 도메인 삭제
              </button>
            )}
            </AdminCollapsibleSection>

            <AdminCollapsibleSection
              title="사이트 아이콘 (파비콘)"
              description="브라우저 탭에 표시되는 작은 아이콘입니다. PNG·JPG·ICO·SVG 이미지를 사용할 수 있습니다."
            >
              <label className="block text-sm font-medium text-gray-700">
                아이콘 이미지 업로드
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico,.png,.jpg,.jpeg,.webp,.svg"
                  disabled={faviconUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFaviconUpload(file);
                    e.target.value = "";
                  }}
                  className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
                />
              </label>
              {faviconUploading && <p className="mt-2 text-sm text-gray-500">업로드 중...</p>}
              {settings.site_favicon_url && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                  <img
                    src={settings.site_favicon_url}
                    alt="사이트 아이콘 미리보기"
                    className="h-10 w-10 rounded border border-gray-200 bg-white object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => void handleClearFavicon()}
                    className="text-sm text-red-600 hover:underline"
                  >
                    아이콘 삭제
                  </button>
                </div>
              )}
            </AdminCollapsibleSection>

            <LinkPreviewSettingsPanel
              settings={settings}
              onChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
              onUploadImage={(file) => void handleLinkPreviewImageUpload(file)}
              uploading={linkPreviewImageUploading}
              previewDomain={settings.main_domain ?? currentOrigin}
            />

            {settingsMessage && (
              <p className="mt-4 text-sm text-emerald-700">{settingsMessage}</p>
            )}

            <button
              type="submit"
              disabled={settingsSaving}
              className="mt-6 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {settingsSaving ? "저장 중..." : "기본 설정 저장"}
            </button>
          </form>
        )}

        {isSitePwaNavKey(activeNav) && hasAdminNavAccess(adminAccess, activeNav) && (
          <form onSubmit={handleSaveSettings} className="space-y-6" {...{ [ADMIN_PRIMARY_FORM_ATTR]: "" }}>
            <SitePwaAdminSection
              section={
                activeNav === "site-pwa"
                  ? "basic"
                  : activeNav === "site-pwa-app-permissions"
                    ? "app-permissions"
                    : activeNav === "site-pwa-loading"
                      ? "loading"
                      : activeNav === "site-pwa-back-exit"
                        ? "back-exit"
                        : "permission-settings"
              }
              settings={settings}
              iconUploading={pwaIconUploading}
              loadingImageUploading={pwaLoadingImageUploading}
              loadingImageFoldCoverUploading={pwaLoadingImageFoldCoverUploading}
              loadingImageTabletUploading={pwaLoadingImageTabletUploading}
              loadingImageTabletUltraUploading={pwaLoadingImageTabletUltraUploading}
              onChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
              onUploadIcon={(file) => void handlePwaIconUpload(file)}
              onClearIcon={() => void handleClearPwaIcon()}
              onUploadLoadingImage={(file) => void handlePwaLoadingImageUpload(file)}
              onClearLoadingImage={() => void handleClearPwaLoadingImage()}
              onUploadLoadingImageFoldCover={(file) => void handlePwaLoadingImageFoldCoverUpload(file)}
              onClearLoadingImageFoldCover={() => void handleClearPwaLoadingImageFoldCover()}
              onUploadLoadingImageTablet={(file) => void handlePwaLoadingImageTabletUpload(file)}
              onClearLoadingImageTablet={() => void handleClearPwaLoadingImageTablet()}
              onUploadLoadingImageTabletUltra={(file) =>
                void handlePwaLoadingImageTabletUltraUpload(file)
              }
              onClearLoadingImageTabletUltra={() => void handleClearPwaLoadingImageTabletUltra()}
            />

            {settingsMessage && (
              <p className="text-sm text-emerald-700">{settingsMessage}</p>
            )}

            <button
              type="submit"
              disabled={settingsSaving}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {settingsSaving ? "저장 중..." : "PWA 설정 저장"}
            </button>
          </form>
        )}

        {hasAdminNavAccess(adminAccess, "site-admin-pwa") && activeNav === "site-admin-pwa" && (
          <form onSubmit={handleSaveSettings} className="space-y-6" {...{ [ADMIN_PRIMARY_FORM_ATTR]: "" }}>
            <SiteAdminPwaAdminSection
              settings={settings}
              iconUploading={adminPwaIconUploading}
              onChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
              onUploadIcon={(file) => void handleAdminPwaIconUpload(file)}
              onClearIcon={() => void handleClearAdminPwaIcon()}
            />

            {settingsMessage && (
              <p className="text-sm text-emerald-700">{settingsMessage}</p>
            )}

            <button
              type="submit"
              disabled={settingsSaving}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {settingsSaving ? "저장 중..." : "관리자 PWA 설정 저장"}
            </button>
          </form>
        )}

        {hasAdminNavAccess(adminAccess, "site-login") && activeNav === "site-login" && (
          <form onSubmit={handleSaveSettings} className="space-y-6" {...{ [ADMIN_PRIMARY_FORM_ATTR]: "" }}>
            <SiteLoginAdminPanel
              settings={settings}
              setSettings={setSettings}
              loginLogoUploading={loginLogoUploading}
              onLoginLogoUpload={handleLoginLogoUpload}
              onClearLoginLogo={handleClearLoginLogo}
            />
            <StudentAuthAdminPanel
              settings={settings}
              setSettings={setSettings}
              guideImageUploading={studentAuthGuideUploading}
              onGuideImageUpload={handleStudentAuthGuideImageUpload}
              onClearGuideImage={handleClearStudentAuthGuideImage}
            />
            <StudentCardBrandAdminPanel
              settings={settings}
              setSettings={setSettings}
              schoolLogoUploading={studentCardSchoolLogoUploading}
              centerImageUploading={studentCardCenterImageUploading}
              backgroundUploading={studentCardBackgroundUploading}
              onSchoolLogoUpload={handleStudentCardSchoolLogoUpload}
              onClearSchoolLogo={handleClearStudentCardSchoolLogo}
              onCenterImageUpload={handleStudentCardCenterImageUpload}
              onClearCenterImage={handleClearStudentCardCenterImage}
              onBackgroundUpload={handleStudentCardBackgroundUpload}
              onClearBackground={handleClearStudentCardBackground}
            />
            {settingsMessage ? <p className="text-sm text-emerald-700">{settingsMessage}</p> : null}
            <button
              type="submit"
              disabled={settingsSaving}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {settingsSaving ? "저장 중..." : "로그인 · 학생증 설정 저장"}
            </button>
          </form>
        )}

        {hasAdminNavAccess(adminAccess, "site-student-card-frames") &&
          activeNav === "site-student-card-frames" && (
          <form onSubmit={handleSaveSettings} className="space-y-6" {...{ [ADMIN_PRIMARY_FORM_ATTR]: "" }}>
            <CardFramesAdminPanel
              settings={settings}
              setSettings={setSettings}
              frameImageUploadingId={cardFrameImageUploadingId}
              onFrameImageUpload={handleCardFrameImageUpload}
            />
            {settingsMessage ? <p className="text-sm text-emerald-700">{settingsMessage}</p> : null}
            <button
              type="submit"
              disabled={settingsSaving}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {settingsSaving ? "저장 중..." : "코스튬 설정 저장"}
            </button>
          </form>
        )}

        {hasAdminNavAccess(adminAccess, "site-student-rewards") &&
          activeNav === "site-student-rewards" && (
          <div className="space-y-6">
            <StudentRewardsAdminPanel settings={settings} />
          </div>
        )}

        {hasAdminNavAccess(adminAccess, "site-student-logs") && activeNav === "site-student-logs" && (
          <StudentApplicationLogsAdminPanel />
        )}

        {hasAdminNavAccess(adminAccess, "site-members") && activeNav === "site-members" && (
          <div className="space-y-6">
            <MembersAdminPanel settings={settings} />
          </div>
        )}

        {hasAdminNavAccess(adminAccess, "site-browser-guide") && activeNav === "site-browser-guide" && (
          <form onSubmit={handleSaveSettings} className="space-y-6" {...{ [ADMIN_PRIMARY_FORM_ATTR]: "" }}>
            <SiteBrowserGuideAdminPanel
              settings={settings}
              onChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
            />
            {settingsMessage && (
              <p className="text-sm text-emerald-700">{settingsMessage}</p>
            )}
            <button
              type="submit"
              disabled={settingsSaving}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {settingsSaving ? "저장 중..." : "브라우저 안내 설정 저장"}
            </button>
          </form>
        )}

        {hasAdminNavAccess(adminAccess, "site-notifications") && activeNav === "site-notifications" && (
          <form onSubmit={handleSaveSettings} className="space-y-6" {...{ [ADMIN_PRIMARY_FORM_ATTR]: "" }}>
            <SiteNotificationsAdminPanel settings={settings} setSettings={setSettings} />
            <button
              type="submit"
              disabled={settingsSaving}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {settingsSaving ? "저장 중..." : "알림 · 푸시 설정 저장"}
            </button>
          </form>
        )}

        {hasAdminNavAccess(adminAccess, "site-nav") && activeNav === "site-nav" && (
          <form onSubmit={handleSaveSettings} className="space-y-6" {...{ [ADMIN_PRIMARY_FORM_ATTR]: "" }}>
            <SiteNavBrandAdminSection
              headerTitle={settings.header_title}
              brandTitle={settings.site_nav_brand_title}
              brandTitleHidden={settings.site_nav_brand_title_hidden ?? false}
              brandIconHidden={settings.site_nav_brand_icon_hidden ?? false}
              brandChipHidden={settings.site_nav_brand_chip_hidden ?? false}
              titleImageUrl={settings.site_nav_brand_title_image_url}
              iconUrl={settings.site_nav_brand_icon_url}
              linkUrl={settings.site_nav_brand_link_url}
              linkRefreshEnabled={settings.site_nav_brand_link_refresh_enabled ?? false}
              iconUploading={navBrandIconUploading}
              titleImageUploading={navBrandTitleImageUploading}
              onBrandTitleChange={(site_nav_brand_title) =>
                setSettings((prev) => ({ ...prev, site_nav_brand_title }))
              }
              onBrandTitleHiddenChange={(site_nav_brand_title_hidden) =>
                setSettings((prev) => ({ ...prev, site_nav_brand_title_hidden }))
              }
              onBrandIconHiddenChange={(site_nav_brand_icon_hidden) =>
                setSettings((prev) => ({ ...prev, site_nav_brand_icon_hidden }))
              }
              onBrandChipHiddenChange={(site_nav_brand_chip_hidden) =>
                setSettings((prev) => ({ ...prev, site_nav_brand_chip_hidden }))
              }
              onUploadTitleImage={(file) => void handleNavBrandTitleImageUpload(file)}
              onClearTitleImage={() => void handleClearNavBrandTitleImage()}
              onUploadIcon={(file) => void handleNavBrandIconUpload(file)}
              onClearIcon={() => void handleClearNavBrandIcon()}
              onLinkUrlChange={(site_nav_brand_link_url) =>
                setSettings((prev) => ({ ...prev, site_nav_brand_link_url }))
              }
              onLinkRefreshEnabledChange={(site_nav_brand_link_refresh_enabled) =>
                setSettings((prev) => ({ ...prev, site_nav_brand_link_refresh_enabled }))
              }
            />

            <SiteNavBackgroundAdminSection
              settings={settings}
              setSettings={setSettings}
              onMessage={setSettingsMessage}
            />

            <SiteNavLinksAdminPanel
              enabled={settings.site_nav_enabled ?? true}
              hintsEnabled={settings.site_nav_hints_enabled ?? true}
              notifyEnabled={settings.site_nav_notify_enabled ?? true}
              floatingChipsUserToggleEnabled={
                settings.site_nav_floating_chips_user_toggle_enabled ?? true
              }
              searchPlaceholder={settings.site_nav_search_placeholder}
              items={settings.site_nav_links ?? []}
              onEnabledChange={(site_nav_enabled) =>
                setSettings((prev) => ({ ...prev, site_nav_enabled }))
              }
              onHintsEnabledChange={(site_nav_hints_enabled) =>
                setSettings((prev) => ({ ...prev, site_nav_hints_enabled }))
              }
              onNotifyEnabledChange={(site_nav_notify_enabled) =>
                setSettings((prev) => ({ ...prev, site_nav_notify_enabled }))
              }
              onFloatingChipsUserToggleEnabledChange={(site_nav_floating_chips_user_toggle_enabled) =>
                setSettings((prev) => ({ ...prev, site_nav_floating_chips_user_toggle_enabled }))
              }
              onSearchPlaceholderChange={(site_nav_search_placeholder) =>
                setSettings((prev) => ({ ...prev, site_nav_search_placeholder }))
              }
              onItemsChange={(site_nav_links) =>
                setSettings((prev) => ({ ...prev, site_nav_links }))
              }
              onUploadIcon={handleNavLinksIconUpload}
              uploadingIndex={navLinksIconUploadingIndex}
              onUploadImage={handleNavLinksImageUpload}
              uploadingImageIndex={navLinksImageUploadingIndex}
            />

            <SiteNavDropdownLinksAdminPanel
              enabled={settings.site_nav_dropdown_enabled ?? true}
              items={settings.site_nav_dropdown_links ?? []}
              onEnabledChange={(site_nav_dropdown_enabled) =>
                setSettings((prev) => ({ ...prev, site_nav_dropdown_enabled }))
              }
              onItemsChange={(site_nav_dropdown_links) =>
                setSettings((prev) => ({ ...prev, site_nav_dropdown_links }))
              }
              onUploadIcon={handleDropdownLinksIconUpload}
              uploadingIndex={dropdownLinksIconUploadingIndex}
              onUploadImage={handleDropdownLinksImageUpload}
              uploadingImageIndex={dropdownLinksImageUploadingIndex}
            />

            {settingsMessage && (
              <p className="mt-4 text-sm text-emerald-700">{settingsMessage}</p>
            )}

            <button
              type="submit"
              disabled={settingsSaving}
              className="mt-6 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {settingsSaving ? "저장 중..." : "상단·메뉴 설정 저장"}
            </button>
          </form>
        )}

        {hasAdminNavAccess(adminAccess, "site-main") && activeNav === "site-main" && (
          <form onSubmit={handleSaveSettings} className="space-y-6" {...{ [ADMIN_PRIMARY_FORM_ATTR]: "" }}>
            <AdminCollapsibleSection
              title="메인 로딩 문구·이미지"
              description="메인 페이지에서 데이터를 불러올 때 표시되는 안내 문구와 이미지입니다. 비우면 기본값이 사용됩니다."
            >
              <label className="block text-sm font-medium text-gray-700">
                사이트 로딩 문구
                <input
                  value={settings.site_loading_message ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      site_loading_message: e.target.value.trim() ? e.target.value : null,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              <p className="mt-1 text-xs text-gray-500">설정을 불러오는 동안 표시됩니다.</p>
              <label className="mt-3 block text-sm font-medium text-gray-700">
                사이트 로딩 이미지
                <input
                  type="file"
                  accept="image/*"
                  disabled={siteLoadingImageUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleSiteLoadingImageUpload(file);
                    e.target.value = "";
                  }}
                  className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
                />
              </label>
              {siteLoadingImageUploading && (
                <p className="mt-2 text-sm text-gray-500">업로드 중...</p>
              )}
              {settings.site_loading_image_url && (
                <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white p-4">
                  <img
                    src={settings.site_loading_image_url}
                    alt="사이트 로딩 이미지"
                    className="mx-auto max-h-48 w-full max-w-sm rounded-lg object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => void handleClearSiteLoadingImage()}
                    className="mt-3 text-sm text-red-600 hover:underline"
                  >
                    사이트 로딩 이미지 삭제
                  </button>
                </div>
              )}

              <label className="mt-4 block text-sm font-medium text-gray-700">
                제휴 업체 로딩 문구
                <input
                  value={settings.partners_loading_message ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      partners_loading_message: e.target.value.trim() ? e.target.value : null,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              <p className="mt-1 text-xs text-gray-500">제휴 업체 목록을 불러오는 동안 표시됩니다.</p>
              <label className="mt-3 block text-sm font-medium text-gray-700">
                제휴 업체 로딩 이미지
                <input
                  type="file"
                  accept="image/*"
                  disabled={partnersLoadingImageUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handlePartnersLoadingImageUpload(file);
                    e.target.value = "";
                  }}
                  className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
                />
              </label>
              {partnersLoadingImageUploading && (
                <p className="mt-2 text-sm text-gray-500">업로드 중...</p>
              )}
              {settings.partners_loading_image_url && (
                <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white p-4">
                  <img
                    src={settings.partners_loading_image_url}
                    alt="제휴 업체 로딩 이미지"
                    className="mx-auto max-h-48 w-full max-w-sm rounded-lg object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => void handleClearPartnersLoadingImage()}
                    className="mt-3 text-sm text-red-600 hover:underline"
                  >
                    제휴 업체 로딩 이미지 삭제
                  </button>
                </div>
              )}
            </AdminCollapsibleSection>

            <AdminCollapsibleSection title="상단 문구 및 메인 타이틀 이미지">
            <label className="block text-sm font-medium text-gray-700">
              메인 타이틀
              <input
                value={settings.header_title}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, header_title: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.header_hero_enabled ?? true}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      header_hero_enabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                메인 히어로 영역 표시
                <span className="text-xs font-normal text-gray-500">
                  (초록 배경·총학생회 배지·서브 설명)
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.header_title_enabled ?? true}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      header_title_enabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                메인 타이틀 텍스트 표시
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.banner_image_only ?? false}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      banner_image_only: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                타이틀 이미지 등록 시 이미지만 표시
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-4">
              <label className="block text-sm font-medium text-gray-700">
                메인 타이틀 색상
                <input
                  type="color"
                  value={settings.header_title_color ?? "#ffffff"}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      header_title_color: e.target.value,
                    }))
                  }
                  className="mt-1 block h-10 w-16 cursor-pointer rounded-lg border border-gray-300"
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({ ...prev, header_title_color: null }))
                }
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                타이틀 색상 삭제
              </button>
            </div>

            <label className="mt-4 block text-sm font-medium text-gray-700">
              메인 타이틀 클릭 URL (선택)
              <input
                type="url"
                value={settings.header_title_link_url ?? ""}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    header_title_link_url: e.target.value,
                  }))
                }
                placeholder="https://"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
            {settings.header_title_link_url && (
              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({ ...prev, header_title_link_url: null }))
                }
                className="mt-2 text-sm text-red-600 hover:underline"
              >
                타이틀 URL 삭제
              </button>
            )}

            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.banner_image_enabled ?? true}
                  disabled={!settings.banner_image_url}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      banner_image_enabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 disabled:opacity-40"
                />
                메인 타이틀 이미지 표시
                {!settings.banner_image_url ? (
                  <span className="text-xs font-normal text-gray-500">(이미지 업로드 후 사용)</span>
                ) : null}
              </label>
              <label className="mt-4 block text-sm font-medium text-gray-700">
                메인 타이틀 이미지 업로드
                <input
                  type="file"
                  accept="image/*"
                  disabled={titleImageUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleTitleImageUpload(file);
                    e.target.value = "";
                  }}
                  className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
                />
              </label>
              <p className="mt-1 text-xs text-gray-500">
                권장 크기 3000×800px. 이미지만 표시 옵션을 켜면 텍스트 타이틀이 숨겨집니다.
              </p>
              {titleImageUploading && (
                <p className="mt-2 text-sm text-gray-500">업로드 중...</p>
              )}
              {settings.banner_image_url && (
                <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white p-4">
                  <img
                    src={settings.banner_image_url}
                    alt="메인 타이틀 이미지 미리보기"
                    className="main-title-banner-image mx-auto"
                  />
                  <button
                    type="button"
                    onClick={() => void handleClearTitleImage()}
                    className="mt-3 text-sm text-red-600 hover:underline"
                  >
                    메인 타이틀 이미지 삭제
                  </button>
                </div>
              )}
            </div>

            <label className="mt-4 block text-sm font-medium text-gray-700">
              서브 설명문
              <textarea
                value={settings.header_sub}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, header_sub: e.target.value }))
                }
                rows={2}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>

            </AdminCollapsibleSection>

            <SiteNoticeFields
              items={settings.notice_items ?? []}
              enabled={settings.notice_text_enabled ?? true}
              textColor={settings.notice_text_color}
              autoEnabled={settings.notice_carousel_auto_enabled ?? false}
              autoIntervalSeconds={settings.notice_carousel_auto_interval_seconds ?? 5}
              onItemsChange={(notice_items) =>
                setSettings((prev) => ({ ...prev, notice_items }))
              }
              onEnabledChange={(notice_text_enabled) =>
                setSettings((prev) => ({ ...prev, notice_text_enabled }))
              }
              onTextColorChange={(notice_text_color) =>
                setSettings((prev) => ({ ...prev, notice_text_color }))
              }
              onAutoEnabledChange={(notice_carousel_auto_enabled) =>
                setSettings((prev) => ({ ...prev, notice_carousel_auto_enabled }))
              }
              onAutoIntervalSecondsChange={(notice_carousel_auto_interval_seconds) =>
                setSettings((prev) => ({ ...prev, notice_carousel_auto_interval_seconds }))
              }
            />

            <ErrorPagesAdminPanel
              settings={settings}
              setSettings={setSettings}
              onMessage={setSettingsMessage}
            />

            <AdminCollapsibleSection
              title="메인 하단 문구"
              description="메인 화면 맨 아래에 사업자 정보, 약관 링크, 저작권, 추가 안내 문구를 표시할 수 있습니다."
              headerActions={
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={settings.footer_text_enabled ?? false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        footer_text_enabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  메인 하단에 표시
                </label>
              }
            >
              <label className="block text-sm font-medium text-gray-700">
                하단 이미지 1
                <span className="ml-1 text-xs font-normal text-gray-500">
                  (사업자 정보 옆에 표시)
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  disabled={footerImageUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFooterImageUpload(file);
                    e.target.value = "";
                  }}
                  className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
                />
              </label>
              {footerImageUploading ? (
                <p className="mt-2 text-sm text-gray-500">이미지 1 업로드 중...</p>
              ) : null}
              {settings.footer_image_url ? (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                  <img
                    src={settings.footer_image_url}
                    alt="하단 이미지 1 미리보기"
                    className="h-16 w-auto max-w-[140px] object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => void handleClearFooterImage()}
                    className="text-sm text-red-600 hover:underline"
                  >
                    이미지 1 삭제
                  </button>
                </div>
              ) : null}
              <label className="mt-4 block text-sm font-medium text-gray-700">
                하단 이미지 2
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  disabled={footerImage2Uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFooterImage2Upload(file);
                    e.target.value = "";
                  }}
                  className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
                />
              </label>
              {footerImage2Uploading ? (
                <p className="mt-2 text-sm text-gray-500">이미지 2 업로드 중...</p>
              ) : null}
              {settings.footer_image2_url ? (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                  <img
                    src={settings.footer_image2_url}
                    alt="하단 이미지 2 미리보기"
                    className="h-16 w-auto max-w-[140px] object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => void handleClearFooterImage2()}
                    className="text-sm text-red-600 hover:underline"
                  >
                    이미지 2 삭제
                  </button>
                </div>
              ) : null}
              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">하단 배경</p>
                <p className="mt-1 text-xs text-gray-500">
                  사이트 다크 모드와 별도로, 하단 영역만 밝은/어두운 배경을 선택할 수 있습니다.
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-700">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="footer_background_theme"
                      checked={!(settings.footer_dark_background_enabled ?? false)}
                      onChange={() =>
                        setSettings((prev) => ({
                          ...prev,
                          footer_dark_background_enabled: false,
                        }))
                      }
                      className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    밝은 배경
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="footer_background_theme"
                      checked={settings.footer_dark_background_enabled ?? false}
                      onChange={() =>
                        setSettings((prev) => ({
                          ...prev,
                          footer_dark_background_enabled: true,
                        }))
                      }
                      className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    어두운 배경
                  </label>
                </div>
              </div>
              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">우측 아이콘 링크</p>
                <p className="mt-1 text-xs text-gray-500">
                  하단 우측에 디스코드·유튜브 등 아이콘 링크를 최대 4개까지 표시합니다. 왼쪽
                  하단 이미지·문구는 그대로 유지됩니다.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={settings.footer_social_hints_enabled ?? true}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          footer_social_hints_enabled: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                    />
                    호버·탭 힌트 표시
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={settings.footer_social_notify_enabled ?? true}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          footer_social_notify_enabled: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                    />
                    클릭 알림(토스트) 표시
                  </label>
                </div>
                <div className="mt-4">
                  <FooterSocialLinksListEditor
                    items={settings.footer_social_links ?? []}
                    onItemsChange={(footer_social_links) =>
                      setSettings((prev) => ({ ...prev, footer_social_links }))
                    }
                    onUploadIcon={handleFooterSocialIconUpload}
                    uploadingIndex={footerSocialIconUploadingIndex}
                  />
                </div>
              </div>
              <label className="mt-4 block text-sm font-medium text-gray-700">
                사업자 정보 1행
                <input
                  type="text"
                  value={settings.footer_business_line1 ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      footer_business_line1: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="mt-3 block text-sm font-medium text-gray-700">
                사업자 정보 2행
                <textarea
                  value={settings.footer_business_line2 ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      footer_business_line2: e.target.value,
                    }))
                  }
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="mt-3 block text-sm font-medium text-gray-700">
                개인정보처리방침 URL
                <input
                  type="text"
                  value={settings.footer_privacy_policy_url ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      footer_privacy_policy_url: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="mt-3 block text-sm font-medium text-gray-700">
                이용약관 URL
                <input
                  type="text"
                  value={settings.footer_terms_url ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      footer_terms_url: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              {(settings.footer_privacy_policy_url || settings.footer_terms_url) && (
                <button
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      footer_privacy_policy_url: null,
                      footer_terms_url: null,
                    }))
                  }
                  className="mt-2 text-sm text-red-600 hover:underline"
                >
                  약관 링크 삭제
                </button>
              )}
              <label className="mt-3 block text-sm font-medium text-gray-700">
                저작권 문구
                <input
                  type="text"
                  value={settings.footer_copyright ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      footer_copyright: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="mt-3 block text-sm font-medium text-gray-700">
                추가 하단 문구
                <span className="ml-1 text-xs font-normal text-gray-500">
                  (사업자 정보·약관·저작권 아래에 표시)
                </span>
                <textarea
                  value={settings.footer_text ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, footer_text: e.target.value }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="block text-sm font-medium text-gray-700">
                  하단 문구 색상
                  <input
                    type="color"
                    value={settings.footer_text_color ?? "#000000"}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        footer_text_color: e.target.value,
                      }))
                    }
                    className="mt-1 block h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, footer_text_color: null }))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  기본 색상
                </button>
              </div>
              {(settings.footer_text?.trim() ||
                settings.footer_image_url?.trim() ||
                settings.footer_image2_url?.trim() ||
                settings.footer_business_line1?.trim() ||
                settings.footer_business_line2?.trim() ||
                settings.footer_copyright?.trim() ||
                settings.footer_privacy_policy_url?.trim() ||
                settings.footer_terms_url?.trim() ||
                (settings.footer_social_links ?? []).some(
                  (item) => item.enabled && item.icon_url && item.href,
                )) && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="mb-2 text-xs font-medium text-gray-500">미리보기</p>
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
                </div>
              )}
            </AdminCollapsibleSection>

            <AdminCollapsibleSection
              title="사이트 점검"
              description="사이트 점검 안내 문구와 이미지를 메인 상단에 표시합니다."
              contentClassName="space-y-3 bg-amber-50/40 p-6"
              headerActions={
                <label className="flex cursor-pointer items-center gap-2 text-sm text-amber-900">
                  <input
                    type="checkbox"
                    checked={settings.site_maintenance_enabled ?? false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        site_maintenance_enabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  메인에 표시
                </label>
              }
            >
              <textarea
                value={settings.site_maintenance_text ?? ""}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    site_maintenance_text: e.target.value,
                  }))
                }
                rows={4}
                placeholder="예: 현재 사이트 점검 중입니다. 잠시 후 다시 이용해 주세요."
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 outline-none focus:border-amber-400"
              />
              <label className="mt-4 block text-sm font-medium text-amber-900">
                점검 안내 이미지 첨부
                <input
                  type="file"
                  accept="image/*"
                  disabled={maintenanceImageUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleMaintenanceImageUpload(file);
                    e.target.value = "";
                  }}
                  className="mt-1 block w-full text-sm text-amber-900 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-amber-800"
                />
              </label>
              {maintenanceImageUploading && (
                <p className="mt-2 text-sm text-amber-800">업로드 중...</p>
              )}
              {settings.site_maintenance_image_url && (
                <div className="mt-3 overflow-hidden rounded-lg border border-amber-200 bg-white p-4">
                  <img
                    src={settings.site_maintenance_image_url}
                    alt="사이트 점검 안내 이미지 미리보기"
                    className="mx-auto max-h-64 w-full max-w-xl rounded-lg object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => void handleClearMaintenanceImage()}
                    className="mt-3 text-sm text-red-600 hover:underline"
                  >
                    점검 이미지 삭제
                  </button>
                </div>
              )}
            </AdminCollapsibleSection>

            {settingsMessage && (
              <p className="mt-4 text-sm text-emerald-700">{settingsMessage}</p>
            )}

            <button
              type="submit"
              disabled={settingsSaving}
              className="mt-6 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {settingsSaving ? "저장 중..." : "메인 화면 설정 저장"}
            </button>
          </form>
        )}

        {hasAdminNavAccess(adminAccess, "ads") && activeNav === "ads" && (
          <>
            {settingsMessage && (
              <p className="mb-4 text-sm text-emerald-700">{settingsMessage}</p>
            )}
            <AdsAdminPanel
              settings={settings}
              setSettings={setSettings}
              saveSettings={saveSettingsToDb}
              onMessage={setSettingsMessage}
            />
          </>
        )}

        {hasAdminNavAccess(adminAccess, "popups") && activeNav === "popups" && (
          <>
            {settingsMessage && (
              <p className="mb-4 text-sm text-emerald-700">{settingsMessage}</p>
            )}
            <PopupAdminPanel onMessage={setSettingsMessage} />
          </>
        )}

        {hasAdminNavAccess(adminAccess, "events") && activeNav === "events" && (
          <>
            {settingsMessage && (
              <p className="mb-4 text-sm text-emerald-700">{settingsMessage}</p>
            )}
            <EventAdminPanel
              settings={settings}
              setSettings={setSettings}
              saveSettings={saveSettingsToDb}
              onMessage={setSettingsMessage}
            />
            <div className="mt-6">
              <EventCommentsAdminPanel />
            </div>
          </>
        )}

        {hasAdminNavAccess(adminAccess, "benefits") && activeNav === "benefits" && (
          <>
            {settingsMessage && (
              <p className="mb-4 text-sm text-emerald-700">{settingsMessage}</p>
            )}
            <BenefitAdminPanel
              settings={settings}
              setSettings={setSettings}
              saveSettings={saveSettingsToDb}
              onMessage={setSettingsMessage}
            />
          </>
        )}

        {hasAdminNavAccess(adminAccess, "board-settings") && activeNav === "board-settings" && (
          <>
            {settingsMessage && (
              <p className="mb-4 text-sm text-emerald-700">{settingsMessage}</p>
            )}
            <BoardSettingsPanel
              settings={settings}
              setSettings={setSettings}
              saveSettings={saveSettingsToDb}
              onMessage={setSettingsMessage}
            />
          </>
        )}

        {hasAdminNavAccess(adminAccess, "board-ip") && activeNav === "board-ip" && (
          <BoardIpManagementAdminPanel />
        )}

        {hasAdminNavAccess(adminAccess, "board-device") && activeNav === "board-device" && (
          <BoardDeviceManagementAdminPanel />
        )}

        {hasAdminNavAccess(adminAccess, "developer") && activeNav === "developer" && (
          <>
            {settingsMessage && (
              <p className="mb-4 text-sm text-emerald-700">{settingsMessage}</p>
            )}
            <DeveloperModePanel
              settings={settings}
              setSettings={setSettings}
              saveSettings={saveSettingsToDb}
              onMessage={setSettingsMessage}
            />
          </>
        )}

        {hasAdminNavAccess(adminAccess, "permissions") && activeNav === "permissions" && (
          <AdminPermissionsPanel currentAccess={adminAccess} />
        )}

        {hasAdminNavAccess(adminAccess, "partner-taxonomy") && activeNav === "partner-taxonomy" && (
          <div className="space-y-8">
            <PartnerCategoriesAdminPanel />
            <PartnerRegionsAdminPanel />
          </div>
        )}

        {hasAdminNavAccess(adminAccess, "partner-search") && activeNav === "partner-search" && (
          <PartnerSearchKeywordsAdminPanel onSaved={loadSettings} />
        )}

        {hasAdminNavAccess(adminAccess, "partner-reviews") && activeNav === "partner-reviews" && (
          <PartnerReviewsAdminPanel />
        )}

        {hasAdminNavAccess(adminAccess, "map-events") && activeNav === "map-events" && (
          <div className="space-y-4">
            {settingsMessage ? (
              <p className="text-sm text-emerald-700">{settingsMessage}</p>
            ) : null}
            <MapEventAdminPanel onMessage={setSettingsMessage} />
          </div>
        )}

        {hasAdminNavAccess(adminAccess, "partner-display") && activeNav === "partner-display" && (
          <div className="space-y-8">
            {settingsMessage && (
              <p className="text-sm text-emerald-700">{settingsMessage}</p>
            )}
            <PartnerMapGeocodeSettingsPanel
              settings={settings}
              setSettings={setSettings}
              saveSettings={saveSettingsToDb}
              onMessage={setSettingsMessage}
            />
            <PartnerListSettingsPanel
              settings={settings}
              setSettings={setSettings}
              saveSettings={saveSettingsToDb}
              onMessage={setSettingsMessage}
            />
          </div>
        )}

        {hasAdminNavAccess(adminAccess, "partners") && activeNav === "partners" && (
          <div className="space-y-6">
            <form onSubmit={handlePartnerSubmit} {...{ [ADMIN_PRIMARY_FORM_ATTR]: "" }}>
              <AdminCollapsibleSection
                title={editingPartnerId ? "제휴업체 수정" : "신규 업체 등록"}
                headerActions={
                  editingPartnerId ? (
                    <button
                      type="button"
                      onClick={cancelEditPartner}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      수정 취소
                    </button>
                  ) : undefined
                }
              >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
                  업체명
                  <input
                    value={partnerForm.name}
                    onChange={(e) =>
                      setPartnerForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  카테고리
                  <select
                    value={partnerForm.category}
                    onChange={(e) =>
                      setPartnerForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                  >
                    {partnerCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                    {!partnerCategories.includes(partnerForm.category) && partnerForm.category && (
                      <option value={partnerForm.category}>{partnerForm.category}</option>
                    )}
                  </select>
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  제휴 연도
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={partnerForm.partnership_year}
                    onChange={(e) =>
                      setPartnerForm((prev) => ({
                        ...prev,
                        partnership_year: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  지역
                  <select
                    value={partnerForm.region_city}
                    onChange={(e) =>
                      setPartnerForm((prev) => ({
                        ...prev,
                        region_city: e.target.value,
                        region_area: "",
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                  >
                    <option value="">지역 미지정</option>
                    {partnerRegions.map((group) => (
                      <option key={group.id} value={group.label}>
                        {group.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  {PARTNER_REGION_AREA_LABEL}
                  <select
                    value={partnerForm.region_area}
                    onChange={(e) =>
                      setPartnerForm((prev) => ({
                        ...prev,
                        region_area: e.target.value,
                      }))
                    }
                    disabled={!partnerForm.region_city}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 disabled:bg-gray-100"
                  >
                    <option value="">지역 미지정</option>
                    {partnerRegions
                      .find((group) => group.label === partnerForm.region_city)
                      ?.areas.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
                  주소
                  <input
                    value={partnerForm.address}
                    onChange={(e) =>
                      setPartnerForm((prev) => ({ ...prev, address: e.target.value }))
                    }
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </label>

                <div className="sm:col-span-2">
                  <PartnerMapRegister
                    partnerId={editingPartnerId}
                    address={partnerForm.address}
                    name={partnerForm.name}
                    latitude={partnerForm.latitude}
                    longitude={partnerForm.longitude}
                    mapUrl={partnerForm.map_url}
                    geocodeApiEnabled={settings.partner_map_geocode_api_enabled ?? true}
                    disabled={partnerSaving}
                    onCoordinatesChange={(latitude, longitude) =>
                      setPartnerForm((prev) => ({ ...prev, latitude, longitude }))
                    }
                    onMapUrlChange={(map_url) =>
                      setPartnerForm((prev) => ({ ...prev, map_url: map_url ?? "" }))
                    }
                  />
                </div>

                <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
                  인스타그램 URL (선택)
                  <input
                    type="text"
                    value={partnerForm.instagram_url}
                    onChange={(e) =>
                      setPartnerForm((prev) => ({ ...prev, instagram_url: e.target.value }))
                    }
                    placeholder="https://instagram.com/업체아이디 또는 @업체아이디"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  혜택 시작일
                  <input
                    type="date"
                    value={partnerForm.benefit_start_date}
                    onChange={(e) =>
                      setPartnerForm((prev) => ({
                        ...prev,
                        benefit_start_date: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  혜택 종료일
                  <input
                    type="date"
                    value={partnerForm.benefit_end_date}
                    onChange={(e) =>
                      setPartnerForm((prev) => ({
                        ...prev,
                        benefit_end_date: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    종료일이 지나면 메인 카드에 「제휴종료」가 자동으로 표시됩니다.
                  </p>
                </label>

                <div className="rounded-xl border border-gray-200 bg-white p-4 sm:col-span-2">
                  <p className="text-sm font-semibold text-gray-900">날짜 옆 표시 문구</p>
                  <p className="mt-1 text-xs text-gray-500">
                    제휴 기간 날짜 오른쪽에 표시됩니다. (예: 제휴중)
                  </p>

                  <label className="mt-3 block text-sm font-medium text-gray-700">
                    표시 문구
                    <input
                      type="text"
                      value={partnerForm.benefit_status_text}
                      onChange={(e) =>
                        setPartnerForm((prev) => ({
                          ...prev,
                          benefit_status_text: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                    />
                  </label>

                  <PartnerTextStyleFields
                    value={{
                      color: partnerForm.benefit_status_color,
                      bold: partnerForm.benefit_status_bold,
                      italic: partnerForm.benefit_status_italic,
                      underline: partnerForm.benefit_status_underline,
                      strikethrough: partnerForm.benefit_status_strikethrough,
                    }}
                    onChange={(patch) =>
                      setPartnerForm((prev) => ({
                        ...prev,
                        ...(patch.color !== undefined
                          ? { benefit_status_color: patch.color }
                          : {}),
                        ...(patch.bold !== undefined ? { benefit_status_bold: patch.bold } : {}),
                        ...(patch.italic !== undefined
                          ? { benefit_status_italic: patch.italic }
                          : {}),
                        ...(patch.underline !== undefined
                          ? { benefit_status_underline: patch.underline }
                          : {}),
                        ...(patch.strikethrough !== undefined
                          ? { benefit_status_strikethrough: patch.strikethrough }
                          : {}),
                      }))
                    }
                  />

                  <PartnerTextStylePreview
                    text={partnerForm.benefit_status_text}
                    value={{
                      color: partnerForm.benefit_status_color,
                      bold: partnerForm.benefit_status_bold,
                      italic: partnerForm.benefit_status_italic,
                      underline: partnerForm.benefit_status_underline,
                      strikethrough: partnerForm.benefit_status_strikethrough,
                    }}
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 sm:col-span-2">
                  <p className="text-sm font-semibold text-gray-900">영업 정보</p>
                  <p className="mt-1 text-xs text-gray-500">
                    제휴 기간·상태 아래에 표시됩니다. 영업시간, 휴무일, 브레이크타임 등을 입력하세요.
                  </p>

                  <label className="mt-3 block text-sm font-medium text-gray-700">
                    영업 정보
                    <textarea
                      value={partnerForm.business_info}
                      onChange={(e) =>
                        setPartnerForm((prev) => ({
                          ...prev,
                          business_info: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder={"예: 월~금 09:00~21:00\n토 10:00~18:00 / 일·공휴일 휴무"}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 sm:col-span-2">
                  <p className="text-sm font-semibold text-gray-900">자세히 보기</p>
                  <p className="mt-1 text-xs text-gray-500">
                    카드에는 기존 혜택·지도·인스타그램이 그대로 표시됩니다. 여기에 입력한 내용은
                    &quot;자세히 보기&quot; 팝업에서 상세 안내로 보여집니다. 섹션 제목은 제휴업체
                    관리 상단 「자세히 보기 표시」에서 변경할 수 있습니다.
                  </p>

                  <label className="mt-3 block text-sm font-medium text-gray-700">
                    상세 설명
                    <textarea
                      value={partnerForm.detail_description}
                      onChange={(e) =>
                        setPartnerForm((prev) => ({
                          ...prev,
                          detail_description: e.target.value,
                        }))
                      }
                      rows={8}
                      placeholder={
                        "예: 이용 방법, 주차 안내, 메뉴 설명, 할인 적용 조건 등\n카드에 담기 어려운 자세한 내용을 입력하세요."
                      }
                      className="mt-1 min-h-[160px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 sm:col-span-2">
                  <p className="text-sm font-semibold text-gray-900">혜택</p>
                  <label className="mt-3 block text-sm font-medium text-gray-700">
                    혜택 내용
                    <textarea
                      value={partnerForm.benefit}
                      onChange={(e) =>
                        setPartnerForm((prev) => ({ ...prev, benefit: e.target.value }))
                      }
                      required
                      rows={8}
                      className="mt-1 min-h-[180px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                    />
                  </label>

                  <PartnerTextStyleFields
                    value={{
                      color: partnerForm.benefit_color,
                      bold: partnerForm.benefit_bold,
                      italic: partnerForm.benefit_italic,
                      underline: partnerForm.benefit_underline,
                      strikethrough: partnerForm.benefit_strikethrough,
                    }}
                    onChange={(patch) =>
                      setPartnerForm((prev) => ({
                        ...prev,
                        ...(patch.color !== undefined ? { benefit_color: patch.color } : {}),
                        ...(patch.bold !== undefined ? { benefit_bold: patch.bold } : {}),
                        ...(patch.italic !== undefined ? { benefit_italic: patch.italic } : {}),
                        ...(patch.underline !== undefined
                          ? { benefit_underline: patch.underline }
                          : {}),
                        ...(patch.strikethrough !== undefined
                          ? { benefit_strikethrough: patch.strikethrough }
                          : {}),
                      }))
                    }
                  />

                  <PartnerTextStylePreview
                    text={partnerForm.benefit}
                    value={{
                      color: partnerForm.benefit_color,
                      bold: partnerForm.benefit_bold,
                      italic: partnerForm.benefit_italic,
                      underline: partnerForm.benefit_underline,
                      strikethrough: partnerForm.benefit_strikethrough,
                    }}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    업체 대표 사진
                    <span className="mt-1 block text-xs font-normal text-gray-500">
                      권장 크기: {getPartnerImageRecommendedLabel()} (4:3 권장, 잘리지 않고 블러 배경으로 표시)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={shopImageUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleShopImageUpload(file);
                      }}
                      className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
                    />
                  </label>
                  {shopImageUploading && (
                    <p className="mt-2 text-sm text-gray-500">업로드 중...</p>
                  )}
                  {partnerForm.image_url && (
                    <div className="mt-3 max-w-[500px] overflow-hidden rounded-lg border border-gray-200">
                      <PartnerCardImage
                        src={partnerForm.image_url}
                        alt="업체 사진 미리보기"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPartnerForm((prev) => ({ ...prev, image_url: null }))
                        }
                        className="mt-3 text-sm text-red-600 hover:underline"
                      >
                        업체 사진 삭제
                      </button>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    상세 추가 사진
                    <span className="mt-1 block text-xs font-normal text-gray-500">
                      자세히 보기 팝업 갤러리에 표시됩니다. 대표 사진 다음 순서로 보입니다. 여러 장 선택 가능.
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={partnerPhotosUploading}
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          void handlePartnerExtraPhotosUpload(files);
                        }
                        e.currentTarget.value = "";
                      }}
                      className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
                    />
                  </label>
                  {partnerPhotosUploading && (
                    <p className="mt-2 text-sm text-gray-500">추가 사진 업로드 중...</p>
                  )}
                  {partnerExtraPhotos.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {partnerExtraPhotos.map((photoUrl, photoIndex) => (
                        <div
                          key={`${photoUrl}-${photoIndex}`}
                          className="overflow-hidden rounded-lg border border-gray-200"
                        >
                          <img
                            src={photoUrl}
                            alt={`추가 사진 ${photoIndex + 1}`}
                            className="aspect-square w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePartnerExtraPhoto(photoIndex)}
                            className="w-full border-t border-gray-200 bg-white px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {partnerMessage && (
                <p className="mt-4 text-sm text-emerald-700">{partnerMessage}</p>
              )}

              <button
                type="submit"
                disabled={partnerSaving}
                className="mt-6 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {partnerSaving
                  ? "저장 중..."
                  : editingPartnerId
                    ? "수정 저장"
                    : "업체 등록"}
              </button>
              </AdminCollapsibleSection>
            </form>

            <AdminCollapsibleSection
              title="등록된 업체 목록"
              description={
                adminPartnersPaginationEnabled && filteredPartners.length > 0
                  ? `총 ${filteredPartners.length}개 · ${partnerListPage}/${partnerListTotalPages} 페이지`
                  : undefined
              }
              contentClassName="p-0"
              headerActions={
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  {adminPartnerYearOptions.length > 0 ? (
                    <select
                      value={partnerListYear === "전체" ? "전체" : String(partnerListYear)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPartnerListYear(value === "전체" ? "전체" : Number(value));
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="전체">전체 연도</option>
                      {adminPartnerYearOptions.map((year) => (
                        <option key={year} value={year}>
                          {formatPartnerYearLabel(year)}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <input
                    type="search"
                    value={partnerListSearch}
                    onChange={(e) => setPartnerListSearch(e.target.value)}
                    placeholder="업체명, 카테고리, 주소, 혜택 검색"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:max-w-xs"
                  />
                </div>
              }
            >
              {partnersLoading ? (
                <p className="px-6 py-8 text-sm text-gray-500">불러오는 중...</p>
              ) : partners.length === 0 ? (
                <p className="px-6 py-8 text-sm text-gray-500">등록된 업체가 없습니다.</p>
              ) : filteredPartners.length === 0 ? (
                <p className="px-6 py-8 text-sm text-gray-500">
                  검색 결과가 없습니다.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-white text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3">사진</th>
                        <th className="px-4 py-3">업체명</th>
                        <th className="px-4 py-3">연도</th>
                        <th className="px-4 py-3">카테고리</th>
                        <th className="px-4 py-3">지역</th>
                        <th className="px-4 py-3">주소</th>
                        <th className="px-4 py-3">혜택</th>
                        <th className="px-4 py-3">게시</th>
                        <th className="min-w-[7.5rem] px-4 py-3">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayedPartners.map((partner) => (
                          <tr key={partner.id} className="align-top">
                            <td className="px-4 py-3">
                              {partner.image_url ? (
                                <img
                                  src={partner.image_url}
                                  alt={partner.name}
                                  className="h-14 w-20 rounded-md object-cover"
                                />
                              ) : (
                                <div className="flex h-14 w-20 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
                                  없음
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {partner.name}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatPartnerYearLabel(resolvePartnerPartnershipYear(partner))}
                            </td>
                            <td className="px-4 py-3 text-gray-600">{partner.category}</td>
                            <td className="px-4 py-3 text-gray-600">
                              {(() => {
                                const parsed = parsePartnerRegion(partner.region);
                                if (!parsed.city) {
                                  return "-";
                                }
                                return parsed.area ? `${parsed.city} · ${parsed.area}` : parsed.city;
                              })()}
                            </td>
                            <td className="max-w-[180px] px-4 py-3 text-gray-600">
                              {partner.address}
                            </td>
                            <td className="max-w-[320px] px-4 py-3 text-gray-600">
                              <span className="line-clamp-6 whitespace-pre-line">
                                {partner.benefit}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => void togglePartnerActive(partner)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                  partner.is_active ? "bg-emerald-500" : "bg-gray-300"
                                }`}
                                aria-label={`${partner.name} 게시 여부`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                    partner.is_active ? "translate-x-6" : "translate-x-1"
                                  }`}
                                />
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => startEditPartner(partner)}
                                  className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                                >
                                  수정
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deletePartner(partner.id)}
                                  className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
                                >
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {adminPartnersPaginationEnabled && filteredPartners.length > 0 && (
                <div className="border-t border-gray-100 px-6 py-4">
                  <Pagination
                    currentPage={partnerListPage}
                    totalPages={partnerListTotalPages}
                    onPageChange={setPartnerListPage}
                    scrollToTopOnChange={false}
                  />
                </div>
              )}
            </AdminCollapsibleSection>
          </div>
        )}

        {hasAdminNavAccess(adminAccess, "boards") && activeNav === "boards" && (
          <BoardDefinitionsAdminPanel />
        )}

        {hasAdminNavAccess(adminAccess, "posts") && activeNav === "posts" && <BoardAdminPanel />}

        {hasAdminNavAccess(adminAccess, "board-reports") && activeNav === "board-reports" && (
          <BoardReportsAdminPanel />
        )}

        {hasAdminNavAccess(adminAccess, "user-settings") && activeNav === "user-settings" && (
          <>
            {settingsMessage && (
              <p className="mb-4 text-sm text-emerald-700">{settingsMessage}</p>
            )}
            <UserSettingsAdminPanel
              settings={settings}
              setSettings={setSettings}
              saveSettings={saveSettingsToDb}
              onMessage={setSettingsMessage}
            />
          </>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
