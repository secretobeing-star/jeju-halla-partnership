import { NextResponse } from "next/server";
import { isAdminManagedComment } from "@/lib/board-comments";
import { isAdminManagedBoardPost } from "@/lib/board-definitions";
import { isAdminManagedPartnerReview } from "@/lib/partner-review";
import { isAdminManagedEventComment } from "@/lib/site-event-comments";
import { getClientIp } from "@/lib/client-ip";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type ReportBody = {
  post_id?: string | null;
  comment_id?: string | null;
  partner_review_id?: string | null;
  event_comment_id?: string | null;
  reason?: string;
};

function isAdminManagedCommentRecord(comment: {
  is_admin_managed?: boolean | null;
  password_hash?: string | null;
}) {
  return isAdminManagedComment({
    is_admin_managed: Boolean(comment.is_admin_managed),
    password_hash: comment.password_hash,
  });
}

function adminManagedReportResponse() {
  return NextResponse.json(
    { error: "Admin-managed content cannot be reported." },
    { status: 403 },
  );
}

export async function POST(request: Request) {
  const admin = createSupabaseAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Server configuration missing SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  let body: ReportBody;

  try {
    body = (await request.json()) as ReportBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const postId = body.post_id?.trim() || null;
  const commentId = body.comment_id?.trim() || null;
  const partnerReviewId = body.partner_review_id?.trim() || null;
  const eventCommentId = body.event_comment_id?.trim() || null;
  const reason = body.reason?.trim() ?? "";

  if (!reason) {
    return NextResponse.json({ error: "Reason is required." }, { status: 400 });
  }

  const targetCount = [postId, commentId, partnerReviewId, eventCommentId].filter(Boolean).length;

  if (targetCount !== 1) {
    return NextResponse.json(
      {
        error:
          "Provide exactly one of post_id, comment_id, partner_review_id, or event_comment_id.",
      },
      { status: 400 },
    );
  }

  if (eventCommentId) {
    const { data: eventComment, error: eventCommentError } = await admin
      .from("site_event_comments")
      .select("id, author_name, is_hidden, is_admin_managed")
      .eq("id", eventCommentId)
      .maybeSingle();

    if (eventCommentError) {
      return NextResponse.json({ error: eventCommentError.message }, { status: 500 });
    }

    if (!eventComment || eventComment.is_hidden) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    if (
      isAdminManagedEventComment({
        author_name: eventComment.author_name,
        is_admin_managed: Boolean(eventComment.is_admin_managed),
      })
    ) {
      return adminManagedReportResponse();
    }

    const { error } = await admin.from("board_reports").insert({
      post_id: null,
      comment_id: null,
      partner_review_id: null,
      event_comment_id: eventCommentId,
      reason,
      reporter_ip: getClientIp(request),
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Already reported." }, { status: 409 });
      }

      if (error.message.includes("event_comment_id")) {
        return NextResponse.json(
          {
            error:
              "이벤트 댓글 신고 SQL이 필요합니다. supabase/site-event-comments-parity.sql을 실행해 주세요.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (partnerReviewId) {
    const { data: review, error: reviewError } = await admin
      .from("partner_reviews")
      .select("id, author_name, is_hidden, is_admin_managed")
      .eq("id", partnerReviewId)
      .maybeSingle();

    if (reviewError) {
      return NextResponse.json({ error: reviewError.message }, { status: 500 });
    }

    if (!review || review.is_hidden) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    if (
      isAdminManagedPartnerReview({
        author_name: review.author_name,
        is_admin_managed: Boolean(review.is_admin_managed),
      })
    ) {
      return adminManagedReportResponse();
    }

    const { error } = await admin.from("board_reports").insert({
      post_id: null,
      comment_id: null,
      partner_review_id: partnerReviewId,
      event_comment_id: null,
      reason,
      reporter_ip: getClientIp(request),
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Already reported." }, { status: 409 });
      }

      if (error.message.includes("board_reports") && error.message.includes("does not exist")) {
        return NextResponse.json(
          {
            error:
              "board_reports table missing. Run supabase SQL (board-reports-and-comment-ip.sql, partner-review-reports-and-ip.sql).",
          },
          { status: 503 },
        );
      }

      if (error.message.includes("partner_review_id")) {
        return NextResponse.json(
          {
            error:
              "Partner review reports SQL is required. Run supabase/partner-review-reports-and-ip.sql.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (commentId) {
    const { data: comment, error: commentError } = await admin
      .from("board_comments")
      .select("id, post_id, is_hidden, is_admin_managed, password_hash")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) {
      return NextResponse.json({ error: commentError.message }, { status: 500 });
    }

    if (!comment || comment.is_hidden) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    if (isAdminManagedCommentRecord(comment)) {
      return adminManagedReportResponse();
    }

    const { error } = await admin.from("board_reports").insert({
      post_id: comment.post_id,
      comment_id: commentId,
      partner_review_id: null,
      event_comment_id: null,
      reason,
      reporter_ip: getClientIp(request),
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Already reported." }, { status: 409 });
      }

      if (error.message.includes("board_reports") && error.message.includes("does not exist")) {
        return NextResponse.json(
          {
            error:
              "board_reports table missing. Run supabase/board-reports-and-comment-ip.sql in Supabase SQL Editor.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  const { data: post, error: postError } = await admin
    .from("board_posts")
    .select("id, author_name, is_hidden, is_admin_managed")
    .eq("id", postId!)
    .maybeSingle();

  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }

  if (!post || post.is_hidden) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (
    isAdminManagedBoardPost({
      author_name: post.author_name,
      is_admin_managed: Boolean(post.is_admin_managed),
    })
  ) {
    return adminManagedReportResponse();
  }

  const { error } = await admin.from("board_reports").insert({
    post_id: postId,
    comment_id: null,
    partner_review_id: null,
    event_comment_id: null,
    reason,
    reporter_ip: getClientIp(request),
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already reported." }, { status: 409 });
    }

    if (error.message.includes("board_reports") && error.message.includes("does not exist")) {
      return NextResponse.json(
        {
          error:
            "board_reports table missing. Run supabase/board-reports-and-comment-ip.sql in Supabase SQL Editor.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
