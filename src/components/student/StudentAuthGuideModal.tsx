"use client";

import StudentShellModal from "@/components/student/StudentShellModal";

type StudentAuthGuideModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  imageUrl?: string | null;
};

export default function StudentAuthGuideModal({
  open,
  onClose,
  onConfirm,
  title,
  body,
  imageUrl = null,
}: StudentAuthGuideModalProps) {
  return (
    <StudentShellModal
      open={open}
      onClose={onClose}
      title={title}
      backHandlerId="student-auth-guide"
      footer={
        <>
          <button type="button" className="student-shell-modal__btn student-shell-modal__btn--ghost" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="student-shell-modal__btn student-shell-modal__btn--primary" onClick={onConfirm}>
            확인
          </button>
        </>
      }
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="student-auth-guide__image" />
      ) : null}
      <p className="student-auth-guide__body whitespace-pre-wrap">{body}</p>
    </StudentShellModal>
  );
}
