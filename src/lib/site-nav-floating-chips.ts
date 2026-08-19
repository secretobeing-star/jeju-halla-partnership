export function getEffectiveSiteNavFloatingChips(
  userPreference: boolean | null | undefined,
  siteDefaultEnabled: boolean | null | undefined,
): boolean {
  if (userPreference != null) {
    return userPreference;
  }

  return siteDefaultEnabled ?? true;
}
