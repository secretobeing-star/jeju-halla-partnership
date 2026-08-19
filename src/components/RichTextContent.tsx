import { prepareBoardContentHtml } from "@/lib/board-video-embed";

type RichTextContentProps = {
  html: string;
  className?: string;
};

export default function RichTextContent({ html, className = "" }: RichTextContentProps) {
  if (!html.trim()) {
    return null;
  }

  const preparedHtml = prepareBoardContentHtml(html);

  return (
    <div
      className={`rich-content text-sm text-gray-800 sm:text-base ${className}`}
      dangerouslySetInnerHTML={{ __html: preparedHtml }}
    />
  );
}
