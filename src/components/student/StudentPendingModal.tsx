"use client";

import StudentShellModal from "@/components/student/StudentShellModal";

type StudentPendingModalProps = {
  open: boolean;
  onClose: () => void;
  message: string;
  title: string;
};

export default function StudentPendingModal({ open, onClose, message, title }: StudentPendingModalProps) {
  return (
    <StudentShellModal
      open={open}
      onClose={onClose}
      title={title}
      backHandlerId="student-pending"
      footer={
        <button type="button" className="student-shell-modal__btn student-shell-modal__btn--primary" onClick={onClose}>
          닫기
        </button>
      }
    >
      <p className="student-pending__message whitespace-pre-wrap">{message}</p>
    </StudentShellModal>
  );
}
