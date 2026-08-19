import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "supabase");

const filesInOrder = [
  "setup-all.sql",
  "fix-storage-rls.sql",
  "board-rpc.sql",
  "board-labels.sql",
  "board-settings.sql",
  "board-definitions.sql",
  "boards-and-settings.sql",
  "board-comments.sql",
  "comment-replies.sql",
  "comment-nested-replies.sql",
  "admin-comment-protection.sql",
  "board-password.sql",
  "board-sort-views.sql",
  "board-post-views.sql",
  "board-pinned-posts.sql",
  "board-pinned-also-in-list.sql",
  "board-pinned-persist-pages.sql",
  "board-pinned-post-large.sql",
  "board-list-font-size.sql",
  "board-list-refresh.sql",
  "board-hidden-post-message.sql",
  "board-admin-posts.sql",
  "board-id-mode.sql",
  "board-section-header-color.sql",
  "feature-update-v1.sql",
  "board-developer-mode-stubs.sql",
  "board-secret-posts.sql",
  "board-hidden-posts-public.sql",
  "board-secret-comments.sql",
  "board-secret-admin-comments.sql",
  "board-secret-comment-developer-features.sql",
  "partner-instagram.sql",
  "partner-categories.sql",
  "partner-regions.sql",
  "partner-regions-hierarchy.sql",
  "partner-regions-dong-eup-myeon.sql",
  "partner-benefit-settings.sql",
  "partner-benefit-box-style.sql",
  "partner-benefit-text-style.sql",
  "partner-business-info.sql",
  "partner-business-info-collapse.sql",
  "partner-status-board-list.sql",
  "partner-status-strikethrough.sql",
  "partner-default-sort.sql",
  "partner-list-refresh.sql",
  "partner-tablet-settings.sql",
  "partner-reactions.sql",
  "partner-reviews.sql",
  "partner-reviews-allow-multiple.sql",
  "partner-reviews-migrate-fix.sql",
  "partner-reviews-admin.sql",
  "partner-reviews-admin-password.sql",
  "partner-reviews-hidden-display.sql",
  "site-title.sql",
  "site-favicon.sql",
  "site-domain.sql",
  "site-loading-message.sql",
  "site-loading-image.sql",
  "site-maintenance.sql",
  "site-popups.sql",
  "sidebar-ads.sql",
  "link-preview-settings.sql",
  "notice-text-link.sql",
  "notice-text-color.sql",
  "notice-items.sql",
  "notice-carousel-auto.sql",
  "footer-text.sql",
  "footer-link.sql",
  "text-color-settings.sql",
  "page-background-settings.sql",
  "page-background-default-enabled.sql",
  "error-page-settings.sql",
  "main-font-size-setting.sql",
  "main-site-size-floating.sql",
  "main-board-position-setting.sql",
  "settings-panel-notice.sql",
  "developer-mode-beta.sql",
  "admin-posts-board-beta.sql",
  "admin-partners-list-pagination.sql",
  "pending-developer-mode-columns.sql",
  "admin-permissions.sql",
  "admin-permissions-tab-grants.sql",
];

const chunks = [
  `-- ============================================================
-- Jeju Halla Partnership — NEW Supabase project bootstrap
-- Generated: ${new Date().toISOString()}
-- Run in Supabase Dashboard → SQL Editor (may need 2–3 batches if too large)
-- ============================================================`,
];

for (const file of filesInOrder) {
  const path = join(root, file);
  const sql = readFileSync(path, "utf8");
  chunks.push(`\n\n-- >>> BEGIN ${file}\n`);
  chunks.push(sql.trim());
  chunks.push(`\n-- <<< END ${file}\n`);
}

chunks.push(`
-- ============================================================
-- After running this script:
-- 1) Authentication → Users → Add user (admin email/password)
-- 2) Replace placeholders below, then run admin grant SQL
-- ============================================================
`);

const outputPath = join(root, "new-project-full.sql");
writeFileSync(outputPath, chunks.join("\n"), "utf8");
console.log(`Wrote ${outputPath} (${chunks.join("\n").length} chars)`);
