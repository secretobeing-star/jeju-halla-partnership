"use client";

import { getSiteMemberSession } from "@/lib/site-member-session";

export default function ShopCostumeWearPreview({ imageUrl }: { imageUrl: string | null }) {
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
    </div>
  );
}
