import type { BoardComment } from "@/lib/supabase";

export const ADMIN_COMMENT_PASSWORD_HASH = "admin-managed";

export function isAdminManagedComment(
  comment: Pick<BoardComment, "is_admin_managed"> & { password_hash?: string | null },
) {
  return (
    comment.is_admin_managed === true ||
    comment.password_hash === ADMIN_COMMENT_PASSWORD_HASH
  );
}

export function canDeleteAdminManagedComment(
  comment: Pick<BoardComment, "is_admin_managed"> & { password_hash?: string | null },
  deleteProtected: boolean,
) {
  if (!isAdminManagedComment(comment)) {
    return true;
  }

  return !deleteProtected;
}

export function canEditUserBoardComment(
  comment: Pick<BoardComment, "is_admin_managed"> & { password_hash?: string | null },
) {
  return !isAdminManagedComment(comment);
}
