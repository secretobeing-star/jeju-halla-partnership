type LoadingStateDisplayProps = {
  message: string;
  imageUrl?: string | null;
  variant?: "fullscreen" | "card";
};

export default function LoadingStateDisplay({
  message,
  imageUrl,
  variant = "card",
}: LoadingStateDisplayProps) {
  const image = imageUrl?.trim() ? (
    <img
      src={imageUrl.trim()}
      alt=""
      className={
        variant === "fullscreen"
          ? "mx-auto max-h-[min(80dvh,32rem)] w-auto max-w-full object-contain"
          : "mx-auto max-h-48 w-auto max-w-full rounded-lg object-contain"
      }
    />
  ) : null;

  if (variant === "fullscreen") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        {image}
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    );
  }

  return (
    <div className="site-main-width mx-auto rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">
      <div className="flex flex-col items-center gap-4">
        {image}
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}
