export function scrollToSection(targetId: string, offsetPx = 12) {
  if (typeof window === "undefined") {
    return;
  }

  const target = document.getElementById(targetId);
  if (!target) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const top = target.getBoundingClientRect().top + window.scrollY - offsetPx;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}
