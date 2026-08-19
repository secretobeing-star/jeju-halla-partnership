import { BoardPost } from "@/lib/supabase";

export function formatBoardListTime(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  const isSameYear = date.getFullYear() === now.getFullYear();
  if (isSameYear) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${month}.${day}`;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export function isNewBoardPost(value: string): boolean {
  return Date.now() - new Date(value).getTime() < 24 * 60 * 60 * 1000;
}

export function buildBoardPostNumberMap(posts: BoardPost[]): Map<string, number> {
  const oldestFirst = [...posts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const map = new Map<string, number>();

  oldestFirst.forEach((post, index) => {
    map.set(post.id, index + 1);
  });

  return map;
}
export function postContentHasImage(content: string | null | undefined): boolean {
  return Boolean(content && /<img\b/i.test(content));
}

export function getCommentBadgeFontClass(count: number): string {
  if (count >= 1000) {
    return "text-[6px]";
  }
  if (count >= 100) {
    return "text-[7px]";
  }
  if (count >= 10) {
    return "text-[8px]";
  }
  return "text-[9px]";
}
