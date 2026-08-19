import type { ReactNode } from "react";

export const DEFAULT_OPTIONAL_TEXT_COLOR = "#000000";

function isHttpUrl(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

export function normalizeOptionalLinkUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
}

export function prepareTextWithOptionalLink(text: string, linkUrl?: string | null) {
  let displayText = text.trim();
  let url = normalizeOptionalLinkUrl(linkUrl);

  const lines = displayText.split("\n");
  if (lines.length >= 2 && isHttpUrl(lines[lines.length - 1] ?? "")) {
    if (!url) {
      url = normalizeOptionalLinkUrl(lines[lines.length - 1]);
    }
    displayText = lines.slice(0, -1).join("\n").trim();
  }

  return { displayText, url };
}

type RenderTextWithOptionalLinkOptions = {
  linkClassName?: string;
  className?: string;
  textColor?: string | null;
};

export function getOptionalTextColor(color?: string | null) {
  const trimmed = color?.trim();
  return trimmed || DEFAULT_OPTIONAL_TEXT_COLOR;
}

export function renderTextWithOptionalLink(
  text: string,
  linkUrl?: string | null,
  {
    linkClassName = "transition hover:opacity-90",
    className = "whitespace-pre-line",
    textColor = null,
  }: RenderTextWithOptionalLinkOptions = {},
): ReactNode {
  const { displayText, url } = prepareTextWithOptionalLink(text, linkUrl);
  const colorStyle = { color: getOptionalTextColor(textColor) };

  if (!displayText) {
    return null;
  }

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`site-optional-text ${className} ${linkClassName}`.trim()}
        style={colorStyle}
      >
        {displayText}
      </a>
    );
  }

  return (
    <span className={`site-optional-text ${className}`.trim()} style={colorStyle}>
      {displayText}
    </span>
  );
}
