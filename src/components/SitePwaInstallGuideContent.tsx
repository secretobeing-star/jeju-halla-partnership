type SitePwaInstallGuideContentProps = {
  appName: string;
  guideMessage: string | null;
  guideSteps: string[];
  compact?: boolean;
};

export default function SitePwaInstallGuideContent({
  appName,
  guideMessage,
  guideSteps,
  compact = false,
}: SitePwaInstallGuideContentProps) {
  const title = appName.trim();

  return (
    <>
      {title ? (
        <p className={compact ? "site-pwa-install-guide__title" : "site-pwa-install-banner__title"}>
          {title}
        </p>
      ) : null}
      {guideMessage ? (
        <p className={compact ? "site-pwa-install-guide__desc" : "site-pwa-install-banner__desc"}>
          {guideMessage}
        </p>
      ) : null}
      {guideSteps.length > 0 ? (
        <ol className={compact ? "site-pwa-install-guide__steps" : "site-pwa-install-banner__steps"}>
          {guideSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
      {!guideMessage && guideSteps.length === 0 ? (
        <p className={compact ? "site-pwa-install-guide__desc" : "site-pwa-install-banner__desc"}>
          브라우저 메뉴에서 홈 화면에 추가하거나 앱 설치를 선택하세요.
        </p>
      ) : null}
    </>
  );
}
