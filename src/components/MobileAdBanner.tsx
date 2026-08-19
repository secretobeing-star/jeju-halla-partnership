import AdMediaContent from "@/components/AdMediaContent";

type MobileAdBannerProps = {
  imageUrl: string;
  linkUrl?: string | null;
  label: string;
};

export default function MobileAdBanner({
  imageUrl,
  linkUrl,
  label,
}: MobileAdBannerProps) {
  const media = (
    <AdMediaContent
      mediaUrl={imageUrl}
      label={label}
      className="mobile-ad-image w-full rounded-xl border border-gray-200 bg-white object-cover shadow-sm"
    />
  );

  return (
    <div className="w-full xl:hidden">
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
