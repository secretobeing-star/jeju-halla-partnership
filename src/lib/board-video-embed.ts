const YOUTUBE_ID_PATTERN = /^[\w-]{11}$/;

export function extractYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
      }

      if (url.pathname.startsWith("/embed/")) {
        const id = url.pathname.split("/")[2];
        return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
      }

      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/")[2];
        return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function escapeHtmlAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildYouTubeEmbedHtml(videoId: string) {
  const safeId = escapeHtmlAttr(videoId);
  return `<div class="rich-video-embed" contenteditable="false"><iframe src="https://www.youtube.com/embed/${safeId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe></div><p><br></p>`;
}

export function buildUploadedVideoHtml(url: string) {
  const safeUrl = escapeHtmlAttr(url);
  return `<div class="rich-video-wrap" contenteditable="false"><video src="${safeUrl}" controls playsinline preload="metadata" class="rich-board-video"></video></div><p><br></p>`;
}

function isAlreadyEmbedded(html: string, videoId: string) {
  return (
    html.includes(`youtube.com/embed/${videoId}`) ||
    html.includes(`rich-video-embed`) && html.includes(videoId)
  );
}

export function embedYouTubeLinksInHtml(html: string): string {
  if (!html.trim()) {
    return html;
  }

  const patterns = [
    /https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?v=([\w-]{11})[^\s<"]*/gi,
    /https?:\/\/youtu\.be\/([\w-]{11})[^\s<"]*/gi,
    /https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts\/([\w-]{11})[^\s<"]*/gi,
    /https?:\/\/(?:www\.|m\.)?youtube\.com\/embed\/([\w-]{11})[^\s<"]*/gi,
  ];

  let result = html;

  for (const pattern of patterns) {
    result = result.replace(pattern, (match, capturedId) => {
      const videoId = capturedId || extractYouTubeVideoId(match);
      if (!videoId || !YOUTUBE_ID_PATTERN.test(videoId)) {
        return match;
      }

      if (isAlreadyEmbedded(result, videoId)) {
        return match;
      }

      return buildYouTubeEmbedHtml(videoId);
    });
  }

  return result;
}

export function prepareBoardContentHtml(html: string): string {
  return embedYouTubeLinksInHtml(html);
}
