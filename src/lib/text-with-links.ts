export function splitTextWithLinks(text: string): Array<{ type: "text" | "link"; value: string }> {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/g);

  return parts
    .filter((part) => part.length > 0)
    .map((part) =>
      /^https?:\/\//.test(part)
        ? { type: "link" as const, value: part }
        : { type: "text" as const, value: part },
    );
}
