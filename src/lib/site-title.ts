export function resolveSiteTitle(siteTitle: string | null | undefined): string {
  return siteTitle?.trim() ?? "";
}

export function resolveAdminSiteTitle(adminSiteTitle: string | null | undefined): string {
  return adminSiteTitle?.trim() ?? "";
}
