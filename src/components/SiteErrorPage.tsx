import Link from "next/link";
import type { ErrorPageDisplaySettings, ErrorPageVariant } from "@/lib/error-page-settings";

type SiteErrorPageProps = {
  variant: ErrorPageVariant;
  settings: ErrorPageDisplaySettings;
  onRetry?: () => void;
  compact?: boolean;
};

export default function SiteErrorPage({ variant, settings, onRetry, compact = false }: SiteErrorPageProps) {
  const statusLabel = variant === "404" ? "404" : "500";

  return (
    <main
      className={`site-error-page flex flex-col items-center justify-center px-4 py-12 sm:px-6 ${
        compact ? "min-h-[22rem]" : "min-h-screen"
      }`}
      style={{
        backgroundColor: settings.bgColor,
        color: settings.textColor,
      }}
    >
      <div className="w-full max-w-md text-center">
        {settings.logoUrl ? (
          <img
            src={settings.logoUrl}
            alt=""
            className="mx-auto mb-6 max-h-24 w-auto max-w-[220px] object-contain"
          />
        ) : null}

        <p className="text-sm font-semibold tracking-wide opacity-70">{statusLabel}</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{settings.title}</h1>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed opacity-85 sm:text-base">
          {settings.message}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
            style={{
              backgroundColor: settings.buttonBgColor,
              color: settings.buttonTextColor,
            }}
          >
            {settings.buttonLabel}
          </Link>
          {variant === "500" && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded-lg border px-5 py-2.5 text-sm font-medium transition hover:opacity-90"
              style={{
                borderColor: settings.buttonBgColor,
                color: settings.textColor,
              }}
            >
              다시 시도
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
