import type { CSSProperties } from "react";

export type PartnerTextStyleValue = {
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
};

export const DEFAULT_PARTNER_TEXT_STYLE: PartnerTextStyleValue = {
  color: "#000000",
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
};

function getTextDecoration(underline: boolean, strikethrough: boolean): string | undefined {
  const decorations: string[] = [];

  if (underline) {
    decorations.push("underline");
  }
  if (strikethrough) {
    decorations.push("line-through");
  }

  return decorations.length > 0 ? decorations.join(" ") : undefined;
}

export function getPartnerTextStyle(value: PartnerTextStyleValue): CSSProperties {
  const color = value.color?.trim();
  const textDecoration = getTextDecoration(value.underline, value.strikethrough);

  return {
    color: color || undefined,
    fontWeight: value.bold ? 700 : undefined,
    fontStyle: value.italic ? "italic" : undefined,
    textDecoration,
    textUnderlineOffset: value.underline ? "3px" : undefined,
    textDecorationThickness: value.underline ? "2px" : undefined,
  };
}
