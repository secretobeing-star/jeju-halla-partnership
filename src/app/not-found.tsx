import SiteErrorPage from "@/components/SiteErrorPage";
import { getErrorPageDisplaySettingsFromServer } from "@/lib/error-page-settings-server";

export default async function NotFound() {
  const settings = await getErrorPageDisplaySettingsFromServer("404");
  return <SiteErrorPage variant="404" settings={settings} />;
}
