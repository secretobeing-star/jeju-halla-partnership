import { supabase } from "@/lib/supabase";

export async function migrateBoardPostTypes(
  migrations: Array<{ from: string; to: string }>,
): Promise<{ error: { message: string } | null }> {
  for (const migration of migrations) {
    const { error } = await supabase
      .from("board_posts")
      .update({ board_type: migration.to })
      .eq("board_type", migration.from);

    if (error) {
      return { error };
    }
  }

  return { error: null };
}
