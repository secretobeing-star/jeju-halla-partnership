export function formatPwaPermissionMessage(text: string | null | undefined) {
  const trimmed = text?.trim();
  if (!trimmed) {
    return null;
  }

  let formatted = trimmed.replace(/\r\n/g, "\n");

  if (!formatted.includes("\n")) {
    formatted = formatted
      .replace(/(합니다\.)\s+/g, "$1\n\n")
      .replace(/\s+(※)/g, "\n\n$1")
      .replace(/\s+((?:알림|위치)\s*\([^)]*\)\s*:)/gi, "\n\n$1");
  }

  return formatted.replace(/\n{3,}/g, "\n\n").trim();
}
