"use client";

import { getSiteMemberSession } from "@/lib/site-member-session";

export function HangerMark({ className = "" }: { className?: string }) {
  return (
    <span className={`season-pass-shop-hanger ${className}`.trim()} aria-hidden>
      <svg viewBox="0 0 48 48" fill="none">
        <path
          d="M24 8.5c2.4 0 4.3 1.9 4.3 4.2 0 2.6-2.4 3.8-4.3 5.6"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M24 18.3 6.8 28.2c-.7.4-.5 1.5.3 1.5h33.8c.8 0 1-1.1.3-1.5L24 18.3Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M10.2 29.7h27.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export default function ShopCostumeWearPreview({
  imageUrl,
  showHanger = true,
}: {
  imageUrl: string | null;
  showHanger?: boolean;
}) {
  const student = getSiteMemberSession()?.student;
  return (
    <div className="season-pass-shop-preview-stage">
      <div className="season-pass-shop-preview__card">
        {imageUrl ? <img src={imageUrl} alt="" className="season-pass-shop-preview__frame" /> : null}
        <div className="season-pass-shop-preview__inner">
          <div className="season-pass-shop-preview__photo">
            {student?.photoUrl ? <img src={student.photoUrl} alt="" /> : <span>사진</span>}
          </div>
          <div className="season-pass-shop-preview__meta">
            <span>제주한라대학교</span>
            <strong>{student?.name?.trim() || "학생"}</strong>
            <p>
              학과 <b>{student?.department?.trim() || "-"}</b>
            </p>
            <p>
              학번 <b>{student?.studentId?.trim() || "-"}</b>
            </p>
          </div>
        </div>
      </div>
      {showHanger ? <HangerMark /> : null}
    </div>
  );
}
