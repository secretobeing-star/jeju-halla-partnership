import { NextRequest, NextResponse } from "next/server";
import {
  adminAuthMiddleware,
  clientIpFromRequest,
} from "@/lib/admin-auth-guard";
import {
  toRewardDistributionLog,
  type RewardDistributionLogRow,
} from "@/lib/reward-distribution-log";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  findCardFrameById,
  loadCardFrameCatalogFromDb,
} from "@/lib/student-card-frames";
import { parseStudentIds } from "@/lib/student-rewards";

export async function GET(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) {
    return auth.error;
  }

  const supabase = createSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 서버 설정이 없습니다." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view")?.trim().toLowerCase() || "rewards";
  const studentId = searchParams.get("studentId")?.trim() || "";
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "100", 10);
  const limit = Math.min(300, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 100));

  if (view === "audit" || view === "logs") {
    let query = supabase
      .from("site_reward_distribution_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (studentId) {
      query = query.eq("target_user_id", studentId);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        {
          error: error.message.includes("site_reward_distribution_logs")
            ? "감사 로그 테이블이 없습니다. Supabase에서 site-reward-distribution-logs.sql을 실행해 주세요."
            : error.message,
        },
        { status: 500 },
      );
    }

    const logs = ((data ?? []) as RewardDistributionLogRow[]).map(
      toRewardDistributionLog,
    );
    return NextResponse.json({ logs });
  }

  let query = supabase
    .from("site_student_rewards")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("site_student_rewards")
          ? "보상 테이블이 없습니다. Supabase에서 site-student-rewards.sql을 실행해 주세요."
          : error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ rewards: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) {
    return auth.error;
  }

  let body: {
    studentIds?: string | string[];
    frameId?: string;
    title?: string;
    message?: string;
    reason?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const studentIds = Array.isArray(body.studentIds)
    ? Array.from(
        new Set(body.studentIds.map((id) => String(id).trim()).filter(Boolean)),
      )
    : parseStudentIds(typeof body.studentIds === "string" ? body.studentIds : "");

  const frameId = body.frameId?.trim() ?? "";
  if (!studentIds.length) {
    return NextResponse.json(
      { error: "받을 학번을 한 명 이상 입력해 주세요." },
      { status: 400 },
    );
  }
  if (!frameId) {
    return NextResponse.json({ error: "지급할 코스튬을 선택해 주세요." }, { status: 400 });
  }

  let frameName = frameId;
  try {
    const catalog = await loadCardFrameCatalogFromDb();
    const frame = findCardFrameById(catalog, frameId);
    if (!frame) {
      return NextResponse.json({ error: "코스튬을 찾을 수 없습니다." }, { status: 404 });
    }
    frameName = frame.name || frame.id;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "코스튬 카탈로그를 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const supabase = createSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 서버 설정이 없습니다." },
      { status: 503 },
    );
  }

  const title = body.title?.trim() || `코스튬 보상 · ${frameName}`;
  const message = body.message?.trim() || "";
  const reason = body.reason?.trim() || message || title;
  const adminId = auth.user.id;
  const adminName =
    (typeof auth.user.user_metadata?.full_name === "string" &&
      auth.user.user_metadata.full_name.trim()) ||
    auth.email;
  const ipAddress = clientIpFromRequest(request) || "";
  const userAgent = request.headers.get("user-agent") || "";

  const rows = studentIds.map((student_id) => ({
    student_id,
    reward_type: "frame",
    frame_id: frameId,
    title,
    message: message || null,
    status: "pending",
    created_by: auth.email,
  }));

  const { data, error } = await supabase
    .from("site_student_rewards")
    .insert(rows)
    .select("id, student_id");

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("site_student_rewards")
          ? "보상 테이블이 없습니다. Supabase에서 site-student-rewards.sql을 실행해 주세요."
          : error.message,
      },
      { status: 500 },
    );
  }

  const auditRows = studentIds.map((target_user_id) => ({
    admin_id: adminId,
    admin_name: adminName,
    target_user_id,
    target_user_name: null,
    reward_type: "FRAME",
    reward_id: frameId,
    reward_name: frameName,
    reason,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  }));

  const { error: auditError } = await supabase
    .from("site_reward_distribution_logs")
    .insert(auditRows);

  if (auditError) {
    return NextResponse.json(
      {
        ok: true,
        sent: data?.length ?? rows.length,
        rewards: data ?? [],
        auditWarning: auditError.message.includes("site_reward_distribution_logs")
          ? "보상은 전송됐지만 감사 로그 테이블이 없습니다. site-reward-distribution-logs.sql을 실행해 주세요."
          : `보상은 전송됐지만 감사 로그 저장에 실패했습니다: ${auditError.message}`,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    sent: data?.length ?? rows.length,
    rewards: data ?? [],
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const logId = searchParams.get("logId")?.trim();

  if (!logId) {
    return NextResponse.json({ error: "로그 ID가 필요합니다." }, { status: 400 });
  }

  const supabase = createSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 서버 설정이 없습니다." },
      { status: 503 },
    );
  }

  const { error } = await supabase
    .from("site_reward_distribution_logs")
    .delete()
    .eq("id", logId);

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("site_reward_distribution_logs")
          ? "감사 로그 테이블이 없습니다. Supabase에서 site-reward-distribution-logs.sql을 실행해 주세요."
          : error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, deletedLogId: logId });
}
