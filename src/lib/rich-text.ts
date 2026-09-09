export function richTextHasVisibleContent(html: string | null | undefined) {
  const value = html ?? "";
  if (/<(img|video|iframe|source)\b/i.test(value)) {
    return true;
  }
  return Boolean(
    value
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim(),
  );
}

export function prepareRichHtmlForDisplay(html: string) {
  return html.replace(/\sloading=["']lazy["']/gi, ' loading="eager"');
}
