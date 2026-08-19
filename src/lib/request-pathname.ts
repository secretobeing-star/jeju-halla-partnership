import { headers } from "next/headers";

export async function getRequestPathname() {
  const headerStore = await headers();
  return headerStore.get("x-pathname") ?? "";
}

export function isAdminRoutePathname(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
