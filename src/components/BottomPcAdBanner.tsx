import AdMediaContent from "@/components/AdMediaContent";

type BottomPcAdBannerProps = {
  imageUrl: string;
  linkUrl?: string | null;
  label: string;
};

export default function BottomPcAdBanner({
  imageUrl,
  linkUrl,
  label,
}: BottomPcAdBannerProps) {
  const media = (
    <AdMediaContent
      mediaUrl={imageUrl}
      label={label}
      className="bottom-pc-ad-image mx-auto rounded-xl border border-gray-200 bg-white object-cover shadow-sm"
    />
  );

  return (
    <div className="hidden xl:block">
      {linkUrl?.trim() ? (
        <a
          href={linkUrl.trim()}
          target="_blank"
          rel="noopener noreferrer"
          className="block transition hover:opacity-90"
        >
          {media}
        </a>
      ) : (
        media
      )}
    </div>
  );
}
