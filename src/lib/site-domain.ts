export function normalizeMainDomain(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (!parsed.hostname) {
      return null;
    }

    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

export function buildCanonicalUrl(
  mainDomain: string | null | undefined,
  pathname: string,
): string | null {
  const origin = normalizeMainDomain(mainDomain);
  if (!origin) {
    return null;
  }

  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (path === "/") {
    return `${origin}/`;
  }

  return `${origin}${path}`;
}
