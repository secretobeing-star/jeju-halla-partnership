"use client";

import { RefObject, useEffect, useRef, useState, type ReactNode } from "react";
import { usePromptModal } from "@/components/PromptModalProvider";
import { getStorageErrorMessage, uploadPartnershipMedia } from "@/lib/storage";
import { isMobileDevice } from "@/lib/is-mobile-device";
import {
  buildUploadedVideoHtml,
  buildYouTubeEmbedHtml,
  extractYouTubeVideoId,
} from "@/lib/board-video-embed";
import { insertHtmlAtCursor } from "@/lib/rich-text-insert";
import {
  getUploadSizeLimitMessage,
  IMAGE_UPLOAD_ACCEPT,
  MOBILE_IMAGE_UPLOAD_ACCEPT,
  VIDEO_UPLOAD_ACCEPT,
} from "@/lib/upload-file-meta";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
  mobileMediaUploadEnabled?: boolean;
  ariaLabelledBy?: string;
  ariaLabel?: string;
};

const FONT_SIZE_STEPS = [
  { value: "2", label: "11" },
  { value: "3", label: "13" },
  { value: "4", label: "15" },
  { value: "5", label: "18" },
  { value: "6", label: "24" },
] as const;

const FONT_FAMILY_OPTIONS = [
  { value: "Nanum Gothic", label: "나눔고딕" },
  { value: "Nanum Myeongjo", label: "나눔명조" },
] as const;

const TEXT_COLOR_PRESETS = [
  { value: "#1f2937", label: "검정" },
  { value: "#dc2626", label: "빨강" },
  { value: "#ea580c", label: "주황" },
  { value: "#ca8a04", label: "노랑" },
  { value: "#16a34a", label: "초록" },
  { value: "#2563eb", label: "파랑" },
  { value: "#7c3aed", label: "보라" },
  { value: "#db2777", label: "분홍" },
  { value: "#ffffff", label: "흰색" },
] as const;

function ToolbarDivider() {
  return <span className="rich-editor-toolbar-divider" aria-hidden />;
}

function ToolbarButton({
  title,
  onClick,
  active = false,
  children,
  className = "",
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`rich-editor-toolbar-btn${active ? " rich-editor-toolbar-btn--active" : ""} ${className}`.trim()}
    >
      {children}
    </button>
  );
}

function IconBold() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="rich-editor-toolbar-icon">
      <path d="M4 2.5h4.2c2.2 0 3.8 1.2 3.8 3.1 0 1.2-.6 2.1-1.6 2.6 1.3.5 2.1 1.6 2.1 3.1 0 2.2-1.8 3.7-4.5 3.7H4V2.5zm2.2 4.8h2c1 0 1.6-.5 1.6-1.3 0-.8-.6-1.3-1.6-1.3h-2v2.6zm0 5.4h2.3c1.1 0 1.8-.5 1.8-1.4 0-.9-.7-1.4-1.8-1.4H6.2v2.8z" />
    </svg>
  );
}

function IconItalic() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="rich-editor-toolbar-icon">
      <path d="M6.5 2.5h5v1.4H9.8L7.7 12.1h1.7v1.4h-5v-1.4h1.7L7.6 3.9H6.5V2.5z" />
    </svg>
  );
}

function IconUnderline() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="rich-editor-toolbar-icon">
      <path d="M4 2.5h1.8v4.8c0 2 1.1 3.2 2.7 3.2s2.7-1.2 2.7-3.2V2.5H13v4.8c0 3-2 4.8-4.5 4.8S4 10.3 4 7.3V2.5zm0 10.2h9v1.3H4v-1.3z" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="rich-editor-toolbar-icon">
      <path d="M6.7 4.6a3.2 3.2 0 0 1 4.5 0l1.3 1.3a3.2 3.2 0 0 1 0 4.5l-.8.8-1-1 .8-.8a1.7 1.7 0 0 0 0-2.4l-1.3-1.3a1.7 1.7 0 0 0-2.4 0L6.7 7.1l-1-1zm-1.4 1.4-1.3 1.3a3.2 3.2 0 0 0 0 4.5l1.3 1.3a3.2 3.2 0 0 0 4.5 0l.8-.8-1-1-.8.8a1.7 1.7 0 0 1-2.4 0L4.6 9.8a1.7 1.7 0 0 1 0-2.4l1.3-1.3-1-1z" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="rich-editor-toolbar-icon">
      <path d="M2.5 3.5h11v9h-11v-9zm1.3 1.3v6.4l2.4-2.4 1.8 1.8 2.5-3.2 2 2.5V4.8H3.8zm1.8 1.4a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
    </svg>
  );
}

function IconYoutube() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="rich-editor-toolbar-icon">
      <path d="M14.5 5.2c-.1-.8-.7-1.4-1.5-1.5C11.6 3.4 8 3.4 8 3.4s-3.6 0-5 .3c-.8.1-1.4.7-1.5 1.5C1.2 6.6 1.2 8 1.2 8s0 1.4.3 2.8c.1.8.7 1.4 1.5 1.5 1.4.3 5 .3 5 .3s3.6 0 5-.3c.8-.1 1.4-.7 1.5-1.5.3-1.4.3-2.8.3-2.8s0-1.4-.3-2.8zM6.7 10.3V5.7L10.4 8l-3.7 2.3z" />
    </svg>
  );
}

function IconAlignLeft() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="rich-editor-toolbar-icon">
      <path d="M2.5 3.5h11v1.3h-11V3.5zm0 3h7v1.3h-7V6.5zm0 3h11v1.3h-11V9.5zm0 3h7v1.3h-7v-1.3z" />
    </svg>
  );
}

function IconAlignCenter() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="rich-editor-toolbar-icon">
      <path d="M2.5 3.5h11v1.3h-11V3.5zm2 3h7v1.3h-7V6.5zm-2 3h11v1.3h-11V9.5zm2 3h7v1.3h-7v-1.3z" />
    </svg>
  );
}

function IconAlignRight() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="rich-editor-toolbar-icon">
      <path d="M2.5 3.5h11v1.3h-11V3.5zm4 3h7v1.3h-7V6.5zm-4 3h11v1.3h-11V9.5zm4 3h7v1.3h-7v-1.3z" />
    </svg>
  );
}

function IconBulletList() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="rich-editor-toolbar-icon">
      <path d="M3.2 4.3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4.7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4.7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5.5 3.5h8v1.3h-8V3.5zm0 4.7h8v1.3h-8V8.2zm0 4.7h8v1.3h-8v-1.3z" />
    </svg>
  );
}

function IconNumberList() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="rich-editor-toolbar-icon">
      <path d="M2.8 3.6h1v3.2H2.5V4.8c.4-.2.7-.5.9-.9-.4.1-.7 0-.9-.3h1.1c0 .5-.3.9-.8 1zm0 4.7h1.1c-.2.3-.5.5-.9.6v1.4H2.5V9.1c.5-.1.9-.4 1.1-.8H2.8zm0 4.7h1.1c-.2.3-.5.5-.9.6v1.4H2.5v-1.7c.5-.1.9-.4 1.1-.8H2.8zM5.5 3.5h8v1.3h-8V3.5zm0 4.7h8v1.3h-8V8.2zm0 4.7h8v1.3h-8v-1.3z" />
    </svg>
  );
}

function IconOutdent() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="rich-editor-toolbar-icon">
      <path d="M2.5 3.5h11v1.3h-11V3.5zm0 3h7v1.3h-7V6.5zm0 3h11v1.3h-11V9.5zm0 3h7v1.3h-7v-1.3zM11.8 6.5 9.5 8.8l2.3 2.3-1 1-3.3-3.3 3.3-3.3 1 1z" />
    </svg>
  );
}

function IconIndent() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="rich-editor-toolbar-icon">
      <path d="M2.5 3.5h11v1.3h-11V3.5zm0 3h7v1.3h-7V6.5zm0 3h11v1.3h-11V9.5zm0 3h7v1.3h-7v-1.3zM7.2 6.5l2.3 2.3-2.3 2.3 1 1 3.3-3.3-3.3-3.3-1 1z" />
    </svg>
  );
}

function IconVideoUpload() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="rich-editor-toolbar-icon">
      <path d="M2.5 3.5h7.5l2 2v5.5h-9.5V3.5zm8.5 2.3 2.5-1.5v6.4l-2.5-1.5V5.8z" />
    </svg>
  );
}

function IconClearFormat() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="rich-editor-toolbar-icon">
      <path d="M8.8 2.5 12 8.8H9.7l-.8-1.5H6.1L4.5 8.8H2.2l3.2-6.3h3.4zm-2 3.8h2.4L8.8 4.6 6.8 6.3zM3.5 10.5h7.5l-.9 1.3H4.4l-.9-1.3z" />
    </svg>
  );
}

function ensureEditorSelection(editor: HTMLElement) {
  if (!editor.innerHTML.trim()) {
    editor.innerHTML = "<div><br></div>";
  }

  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function getImageWidthPercent(img: HTMLImageElement, editor: HTMLElement) {
  const editorWidth = editor.clientWidth || 1;
  const renderedWidth = img.getBoundingClientRect().width;
  return Math.min(100, Math.max(10, Math.round((renderedWidth / editorWidth) * 100)));
}

function applyImageStyles(img: HTMLImageElement) {
  img.draggable = false;
  img.classList.add("rich-editor-image");
  if (!img.style.maxWidth) {
    img.style.maxWidth = "100%";
  }
  if (!img.style.height) {
    img.style.height = "auto";
  }
  if (!img.style.display) {
    img.style.display = "inline-block";
  }
  if (!img.style.verticalAlign) {
    img.style.verticalAlign = "top";
  }
  if (!img.style.margin) {
    img.style.margin = "0.5rem";
  }
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "내용을 입력하세요",
  minHeightClassName = "min-h-40",
  mobileMediaUploadEnabled = true,
  ariaLabelledBy,
  ariaLabel,
}: RichTextEditorProps) {
  const { prompt, alert } = usePromptModal();
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputId = useRef(`rich-editor-image-${Math.random().toString(36).slice(2)}`);
  const videoInputId = useRef(`rich-editor-video-${Math.random().toString(36).slice(2)}`);
  const isInternalChange = useRef(false);
  const imageDragRef = useRef<{ image: HTMLImageElement; moved: boolean } | null>(null);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [selectedImageWidth, setSelectedImageWidth] = useState(50);
  const [textColor, setTextColor] = useState("#1f2937");
  const [highlightColor, setHighlightColor] = useState("#fff59d");
  const [fontSizeIndex, setFontSizeIndex] = useState(1);
  const [fontFamilyIndex, setFontFamilyIndex] = useState(0);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaUploadMessage, setMediaUploadMessage] = useState<string | null>(null);
  const isMobile = isMobileDevice();
  const canUploadMediaOnDevice = mobileMediaUploadEnabled;
  const imageAccept = isMobile ? MOBILE_IMAGE_UPLOAD_ACCEPT : IMAGE_UPLOAD_ACCEPT;

  function buildImageHtml(url: string) {
    return `<img src="${url}" alt="" loading="lazy" decoding="async" class="rich-editor-image" style="width:50%;max-width:100%;height:auto;display:inline-block;vertical-align:top;margin:0.5rem;" />`;
  }

  function insertImageHtml(url: string) {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const html = buildImageHtml(url);

    if (isMobile) {
      editor.insertAdjacentHTML("beforeend", html);
      isInternalChange.current = true;
      onChange(editor.innerHTML);
      window.requestAnimationFrame(() => bindEditorImages());
      return;
    }

    insertHtmlAtCursor(editor, html);
    syncContent();
  }

  function applyFontSize(index: number) {
    const nextIndex = Math.min(FONT_SIZE_STEPS.length - 1, Math.max(0, index));
    setFontSizeIndex(nextIndex);
    exec("fontSize", FONT_SIZE_STEPS[nextIndex].value);
  }

  function applyFontFamily(index: number) {
    const nextIndex = Math.min(FONT_FAMILY_OPTIONS.length - 1, Math.max(0, index));
    setFontFamilyIndex(nextIndex);
    exec("fontName", FONT_FAMILY_OPTIONS[nextIndex].value);
  }

  function handleHighlightColorChange(color: string) {
    setHighlightColor(color);
    editorRef.current?.focus();
    document.execCommand("hiliteColor", false, color);
    syncContent();
  }

  async function handleInsertLink() {
    const input = await prompt({
      title: "링크",
      description: "연결할 주소를 입력하세요.",
      placeholder: "https://example.com",
      confirmLabel: "추가",
    });

    if (!input?.trim()) {
      return;
    }

    try {
      const parsed = new URL(input.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("invalid");
      }
      exec("createLink", parsed.toString());
    } catch {
      await alert({
        title: "입력 오류",
        message: "http:// 또는 https:// 로 시작하는 주소를 입력해 주세요.",
      });
    }
  }

  useEffect(() => {
    try {
      document.execCommand("defaultParagraphSeparator", false, "div");
    } catch {
      // ignore unsupported browsers
    }
  }, []);

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      bindEditorImages();
    }
  }, [value]);

  function bindEditorImages() {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    editor.querySelectorAll("img").forEach((img) => {
      applyImageStyles(img);
      img.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setSelectedImage(img);
        setSelectedImageWidth(getImageWidthPercent(img, editor));
      };
      img.onmousedown = (event) => {
        if (event.button !== 0) {
          return;
        }
        event.preventDefault();
        setSelectedImage(img);
        setSelectedImageWidth(getImageWidthPercent(img, editor));
        startImageMove(event, img);
      };
    });
  }

  function syncContent() {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
      bindEditorImages();
    }
  }

  function exec(command: string, commandValue?: string) {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    editor.focus();
    ensureEditorSelection(editor);
    document.execCommand(command, false, commandValue);
    syncContent();
  }

  function handleTextColorChange(color: string) {
    setTextColor(color);
    exec("foreColor", color);
  }

  async function handleImageUpload(file: File) {
    setMediaUploading(true);
    setMediaUploadMessage("사진을 업로드하는 중...");
    try {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
      const url = await uploadPartnershipMedia(file, "board-images");
      setMediaUploadMessage("글에 사진을 넣는 중...");
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
      insertImageHtml(url);
      setMediaUploadMessage("사진이 추가되었습니다.");
    } catch (error) {
      await alert({ title: "업로드 실패", message: getStorageErrorMessage(error) });
    } finally {
      setMediaUploading(false);
      window.setTimeout(() => setMediaUploadMessage(null), 1200);
    }
  }

  async function handleVideoUpload(file: File) {
    const sizeError = getUploadSizeLimitMessage(file, 50);
    if (sizeError) {
      await alert({ title: "업로드 제한", message: sizeError });
      return;
    }

    setMediaUploading(true);
    setMediaUploadMessage("동영상을 업로드하는 중...");
    try {
      const url = await uploadPartnershipMedia(file, "board-videos");
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      insertHtmlAtCursor(editor, buildUploadedVideoHtml(url));
      syncContent();
    } catch (error) {
      await alert({
        title: "업로드 실패",
        message: `동영상 업로드 실패: ${getStorageErrorMessage(error)}`,
      });
    } finally {
      setMediaUploading(false);
      setMediaUploadMessage(null);
    }
  }

  async function handleInsertVideoLink() {
    const input = await prompt({
      title: "영상 링크",
      description: "유튜브 또는 영상 링크를 입력하세요.",
      placeholder: "https://www.youtube.com/watch?v=...",
      confirmLabel: "추가",
    });

    if (!input?.trim()) {
      return;
    }

    const videoId = extractYouTubeVideoId(input);
    if (!videoId) {
      await alert({
        title: "링크 오류",
        message: "지원하는 유튜브 링크가 아닙니다. watch, youtu.be, shorts 링크를 사용해 주세요.",
      });
      return;
    }

    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    insertHtmlAtCursor(editor, buildYouTubeEmbedHtml(videoId));
    syncContent();
  }

  async function handleRemoveSelectedImage() {
    if (selectedImage) {
      selectedImage.remove();
      setSelectedImage(null);
      syncContent();
      return;
    }

    await alert({
      title: "사진 선택",
      message: "삭제할 사진을 먼저 클릭해 선택해 주세요.",
    });
  }

  function handleImageWidthChange(widthPercent: number) {
    if (!selectedImage) {
      return;
    }

    const clamped = Math.min(100, Math.max(10, widthPercent));
    selectedImage.style.width = `${clamped}%`;
    selectedImage.style.maxWidth = "100%";
    selectedImage.style.height = "auto";
    setSelectedImageWidth(clamped);
    syncContent();
  }

  function startImageResize(event: React.MouseEvent, image: HTMLImageElement) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = image.getBoundingClientRect().width;
    const editor = editorRef.current;

    function onMove(moveEvent: MouseEvent) {
      const nextWidth = Math.max(40, startWidth + (moveEvent.clientX - startX));
      image.style.width = `${nextWidth}px`;
      image.style.maxWidth = "100%";
      image.style.height = "auto";
      if (editor) {
        setSelectedImageWidth(getImageWidthPercent(image, editor));
      }
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      syncContent();
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function startImageMove(event: MouseEvent, image: HTMLImageElement) {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const startX = event.clientX;
    const startY = event.clientY;
    imageDragRef.current = { image, moved: false };

    function onMove(moveEvent: MouseEvent) {
      if (!imageDragRef.current) {
        return;
      }

      const distance = Math.abs(moveEvent.clientX - startX) + Math.abs(moveEvent.clientY - startY);
      if (distance < 6) {
        return;
      }

      imageDragRef.current.moved = true;
      image.style.opacity = "0.55";
      image.style.outline = "2px dashed #10b981";
    }

    function onUp(upEvent: MouseEvent) {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);

      const dragState = imageDragRef.current;
      imageDragRef.current = null;
      image.style.opacity = "";
      image.style.outline = "";

      if (!dragState?.moved) {
        return;
      }

      const range = document.caretRangeFromPoint(upEvent.clientX, upEvent.clientY);
      const currentEditor = editorRef.current;
      if (range && currentEditor?.contains(range.startContainer)) {
        range.collapse(true);
        range.insertNode(image);
      }

      syncContent();
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function handleEditorClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLImageElement) {
      return;
    }
    setSelectedImage(null);
  }

  return (
    <div className="rich-editor-shell">
      <div className="rich-editor-toolbar">
        <div className="rich-editor-toolbar-group">
          <ToolbarButton
            title="글자 크기 줄이기"
            onClick={() => applyFontSize(fontSizeIndex - 1)}
          >
            −
          </ToolbarButton>
          <span className="rich-editor-font-size">{FONT_SIZE_STEPS[fontSizeIndex].label}</span>
          <ToolbarButton
            title="글자 크기 키우기"
            onClick={() => applyFontSize(fontSizeIndex + 1)}
          >
            +
          </ToolbarButton>
          <select
            className="rich-editor-font-family"
            value={fontFamilyIndex}
            title="글꼴"
            aria-label="글꼴"
            onMouseDown={(event) => event.preventDefault()}
            onChange={(event) => applyFontFamily(Number(event.target.value))}
          >
            {FONT_FAMILY_OPTIONS.map((option, index) => (
              <option key={option.value} value={index}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <ToolbarDivider />

        <div className="rich-editor-toolbar-group">
          <ToolbarButton title="굵게" onClick={() => exec("bold")}>
            <IconBold />
          </ToolbarButton>
          <ToolbarButton title="기울임" onClick={() => exec("italic")}>
            <IconItalic />
          </ToolbarButton>
          <ToolbarButton title="밑줄" onClick={() => exec("underline")}>
            <IconUnderline />
          </ToolbarButton>
          <label className="rich-editor-color-btn" title="글자 색" onMouseDown={(event) => event.preventDefault()}>
            <span className="rich-editor-color-letter" style={{ borderBottomColor: textColor }}>
              A
            </span>
            <input
              type="color"
              value={textColor}
              onChange={(event) => handleTextColorChange(event.target.value)}
              className="rich-editor-color-input"
              aria-label="글자 색 선택"
            />
          </label>
          <label className="rich-editor-color-btn" title="형광펜" onMouseDown={(event) => event.preventDefault()}>
            <span className="rich-editor-marker-icon" style={{ backgroundColor: highlightColor }} />
            <input
              type="color"
              value={highlightColor}
              onChange={(event) => handleHighlightColorChange(event.target.value)}
              className="rich-editor-color-input"
              aria-label="형광펜 색 선택"
            />
          </label>
        </div>

        <ToolbarDivider />

        <div className="rich-editor-toolbar-group">
          <ToolbarButton title="링크" onClick={() => void handleInsertLink()}>
            <IconLink />
          </ToolbarButton>
          {canUploadMediaOnDevice ? (
            <>
              <label
                htmlFor={imageInputId.current}
                onMouseDown={(event) => event.preventDefault()}
                className={`rich-editor-toolbar-btn rich-editor-toolbar-btn--label${
                  mediaUploading ? " rich-editor-toolbar-btn--disabled" : ""
                }`}
                title="사진 추가"
              >
                <IconImage />
              </label>
              <label
                htmlFor={videoInputId.current}
                onMouseDown={(event) => event.preventDefault()}
                className={`rich-editor-toolbar-btn rich-editor-toolbar-btn--label${
                  mediaUploading ? " rich-editor-toolbar-btn--disabled" : ""
                }`}
                title="동영상 업로드"
              >
                <IconVideoUpload />
              </label>
            </>
          ) : null}
          <ToolbarButton title="유튜브 링크" onClick={() => void handleInsertVideoLink()}>
            <IconYoutube />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        <div className="rich-editor-toolbar-group">
          <ToolbarButton title="왼쪽 정렬" onClick={() => exec("justifyLeft")}>
            <IconAlignLeft />
          </ToolbarButton>
          <ToolbarButton title="가운데 정렬" onClick={() => exec("justifyCenter")}>
            <IconAlignCenter />
          </ToolbarButton>
          <ToolbarButton title="오른쪽 정렬" onClick={() => exec("justifyRight")}>
            <IconAlignRight />
          </ToolbarButton>
          <ToolbarButton title="글머리 기호" onClick={() => exec("insertUnorderedList")}>
            <IconBulletList />
          </ToolbarButton>
          <ToolbarButton title="번호 매기기" onClick={() => exec("insertOrderedList")}>
            <IconNumberList />
          </ToolbarButton>
          <ToolbarButton title="내어쓰기" onClick={() => exec("outdent")}>
            <IconOutdent />
          </ToolbarButton>
          <ToolbarButton title="들여쓰기" onClick={() => exec("indent")}>
            <IconIndent />
          </ToolbarButton>
          <ToolbarButton title="서식 지우기" onClick={() => exec("removeFormat")}>
            <IconClearFormat />
          </ToolbarButton>
        </div>

        {canUploadMediaOnDevice ? (
          <>
            <input
              id={imageInputId.current}
              type="file"
              accept={imageAccept}
              className="sr-only"
              disabled={mediaUploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImageUpload(file);
                event.target.value = "";
              }}
            />
            <input
              id={videoInputId.current}
              type="file"
              accept={VIDEO_UPLOAD_ACCEPT}
              className="sr-only"
              disabled={mediaUploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleVideoUpload(file);
                event.target.value = "";
              }}
            />
          </>
        ) : (
          <span className="rich-editor-toolbar-note">사진·동영상 첨부 꺼짐</span>
        )}

        {mediaUploading ? (
          <span className="rich-editor-toolbar-status">{mediaUploadMessage ?? "업로드 중..."}</span>
        ) : null}
      </div>

      <div className="rich-editor-color-presets" role="group" aria-label="글자 색">
        <span className="rich-editor-color-presets-label">글자 색</span>
        {TEXT_COLOR_PRESETS.map((preset) => {
          const selected = textColor.toLowerCase() === preset.value.toLowerCase();
          return (
            <button
              key={preset.value}
              type="button"
              title={preset.label}
              aria-label={`글자 색 ${preset.label}`}
              aria-pressed={selected}
              className={[
                "rich-editor-color-preset",
                preset.value === "#ffffff" ? "rich-editor-color-preset--light" : "",
                selected ? "rich-editor-color-preset--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ backgroundColor: preset.value }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleTextColorChange(preset.value)}
            />
          );
        })}
      </div>

      {selectedImage ? (
        <div className="rich-editor-image-tools">
          <span className="rich-editor-image-tools-label">사진 크기</span>
          <input
            type="range"
            min={10}
            max={100}
            value={selectedImageWidth}
            onChange={(event) => handleImageWidthChange(Number(event.target.value))}
            className="rich-editor-image-tools-range"
          />
          <span className="rich-editor-image-tools-value">{selectedImageWidth}%</span>
          <button
            type="button"
            onMouseDown={(event) => startImageResize(event, selectedImage)}
            className="rich-editor-image-tools-btn"
            title="오른쪽 아래 모서리를 드래그해 크기를 조절합니다"
          >
            모서리 드래그
          </button>
          <button
            type="button"
            onClick={() => void handleRemoveSelectedImage()}
            className="rich-editor-image-tools-btn rich-editor-image-tools-btn--danger"
          >
            사진 삭제
          </button>
          <span className="rich-editor-image-tools-hint">사진을 드래그하면 위치 이동</span>
        </div>
      ) : null}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabelledBy ? undefined : ariaLabel ?? "내용"}
        onInput={syncContent}
        onBlur={syncContent}
        onClick={handleEditorClick}
        onDragOver={(event) => event.preventDefault()}
        data-placeholder={placeholder}
        className={`rich-editor rich-content ${minHeightClassName} empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]`}
      />
    </div>
  );
}
