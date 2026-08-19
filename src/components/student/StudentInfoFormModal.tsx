"use client";

import { FormEvent, useMemo, useState } from "react";
import StudentShellModal from "@/components/student/StudentShellModal";
import { getBoardVoterKey } from "@/lib/board-voter";
import { getStorageErrorMessage, uploadPartnershipImage } from "@/lib/storage";
import type { SiteMemberStudentProfile } from "@/lib/site-member-session";
import {
  isStudentFormFieldVisible,
  STUDENT_FORM_REQUIRED_KEYS,
  type SiteStudentCustomField,
  type SiteStudentFormFieldKey,
  type SiteStudentUiLabels,
  type StudentGraduationStatus,
} from "@/lib/site-student-auth-settings";

type StudentInfoFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmitted: (student: SiteMemberStudentProfile) => void;
  labels: SiteStudentUiLabels;
  hiddenFormFields?: SiteStudentFormFieldKey[];
  customFields?: SiteStudentCustomField[];
};

type FormState = {
  department: string;
  major: string;
  studentId: string;
  name: string;
  email: string;
  phone: string;
  graduationStatus: StudentGraduationStatus;
  notes: string;
  photoUrl: string | null;
  customValues: Record<string, string>;
};

const INITIAL: FormState = {
  department: "",
  major: "",
  studentId: "",
  name: "",
  email: "",
  phone: "",
  graduationStatus: "enrolled",
  notes: "",
  photoUrl: null,
  customValues: {},
};

export default function StudentInfoFormModal({
  open,
  onClose,
  onSubmitted,
  labels,
  hiddenFormFields = [],
  customFields = [],
}: StudentInfoFormModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const base = {
      department: isStudentFormFieldVisible("department", hiddenFormFields),
      major: isStudentFormFieldVisible("major", hiddenFormFields),
      studentId: isStudentFormFieldVisible("studentId", hiddenFormFields),
      name: isStudentFormFieldVisible("name", hiddenFormFields),
      phone: isStudentFormFieldVisible("phone", hiddenFormFields),
      graduation: isStudentFormFieldVisible("graduation", hiddenFormFields),
      notes: isStudentFormFieldVisible("notes", hiddenFormFields),
      photo: isStudentFormFieldVisible("photo", hiddenFormFields),
    };
    // 학번·이름은 시트 연동 필수 — 관리자에서 숨겨도 입력란 강제 표시
    for (const key of STUDENT_FORM_REQUIRED_KEYS) {
      if (key === "studentId") base.studentId = true;
      if (key === "name") base.name = true;
    }
    return base;
  }, [hiddenFormFields]);

  async function handlePhotoChange(file: File | null) {
    if (!file) {
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const url = await uploadPartnershipImage(file, "student-photos");
      setForm((prev) => ({ ...prev, photoUrl: url }));
    } catch (uploadError) {
      setError(getStorageErrorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const studentId = form.studentId.trim();
      const name = form.name.trim();
      const email = form.email.trim();
      const department = visible.department ? form.department.trim() : "";
      const major = visible.major ? form.major.trim() : "";
      const phone = visible.phone ? form.phone.trim() : "";
      const notes = visible.notes ? form.notes.trim() : "";
      const graduationStatus = visible.graduation
        ? form.graduationStatus
        : "enrolled";
      const deviceKey = getBoardVoterKey();
      const statusType = graduationStatus === "graduated" ? "졸업" : "재학";

      if (!studentId) {
        throw new Error("학번을 입력해 주세요.");
      }
      if (!name) {
        throw new Error("이름을 입력해 주세요.");
      }

      const customEntries = customFields
        .map((field) => ({
          id: field.id,
          label: field.label,
          value: form.customValues[field.id]?.trim() ?? "",
        }))
        .filter((entry) => entry.label);

      // 시트 웹훅 표준 payload (서버에서 Apps Script로 중계)
      const sheetPayload = {
        sheetName: "사용자_로그",
        student_id: studentId,
        name,
        status: "대기",
        image_url: visible.photo ? form.photoUrl ?? "" : "",
        department,
        remarks: notes,
        created_at: new Date().toISOString(),
      };

      console.log("전송 데이터:", sheetPayload);

      const applyBody = {
        department,
        major,
        studentId,
        name,
        email,
        phone,
        graduationStatus,
        notes,
        photoUrl: visible.photo ? form.photoUrl : null,
        customFields: customEntries,
        deviceKey,
        statusType,
        userId: deviceKey,
        visibleFields: {
          department: visible.department,
          major: visible.major,
          phone: visible.phone,
          graduation: visible.graduation,
        },
      };

      console.log("전송 데이터(apply):", applyBody);

      // 비즈니스 로직(중복·탈퇴차단·시트API)은 apply, 웹훅은 apply 내부에서 /api/submit 동일 규격으로 전송
      const response = await fetch("/api/student/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applyBody),
      });
      const payload = (await response.json()) as {
        error?: string;
        status?: string;
        message?: string;
        student?: SiteMemberStudentProfile;
      };

      if (payload.status === "already_approved" && payload.student) {
        setForm(INITIAL);
        onSubmitted({ ...payload.student, approvalStatus: "approved" });
        return;
      }

      if (!response.ok || !payload.student) {
        throw new Error(payload.error || payload.message || "신청에 실패했습니다.");
      }
      setForm(INITIAL);
      onSubmitted(payload.student);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StudentShellModal
      open={open}
      onClose={onClose}
      title={labels.formTitle}
      backHandlerId="student-info-form"
      footer={
        <>
          <button
            type="button"
            className="student-shell-modal__btn student-shell-modal__btn--ghost"
            onClick={onClose}
            disabled={submitting}
          >
            {labels.cancel}
          </button>
          <button
            type="submit"
            form="student-info-form"
            className="student-shell-modal__btn student-shell-modal__btn--primary"
            disabled={submitting || uploading}
          >
            {submitting ? labels.submitting : labels.submit}
          </button>
        </>
      }
    >
      <form
        id="student-info-form"
        className="student-info-form"
        onSubmit={(e) => void handleSubmit(e)}
      >
        {visible.department ? (
          <label className="student-info-form__field">
            {labels.department}
            <input
              required
              name="department"
              autoComplete="organization-title"
              value={form.department}
              onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
            />
          </label>
        ) : null}
        {visible.major ? (
          <label className="student-info-form__field">
            {labels.major}
            <input
              required
              name="major"
              value={form.major}
              onChange={(e) => setForm((prev) => ({ ...prev, major: e.target.value }))}
            />
          </label>
        ) : null}
        <label className="student-info-form__field">
          {labels.studentId}
          <input
            required
            name="studentId"
            autoComplete="username"
            inputMode="numeric"
            value={form.studentId}
            onChange={(e) => setForm((prev) => ({ ...prev, studentId: e.target.value }))}
          />
        </label>
        <label className="student-info-form__field">
          {labels.name}
          <input
            required
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </label>
        <label className="student-info-form__field">
          이메일
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="선택"
          />
        </label>
        {visible.phone ? (
          <label className="student-info-form__field">
            {labels.phone}
            <input
              required
              name="phone"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </label>
        ) : null}
        {visible.graduation ? (
          <fieldset className="student-info-form__field">
            <legend>{labels.graduation}</legend>
            <div className="student-info-form__radios">
              <label>
                <input
                  type="radio"
                  name="graduation"
                  checked={form.graduationStatus === "enrolled"}
                  onChange={() => setForm((prev) => ({ ...prev, graduationStatus: "enrolled" }))}
                />
                {labels.enrolled}
              </label>
              <label>
                <input
                  type="radio"
                  name="graduation"
                  checked={form.graduationStatus === "graduated"}
                  onChange={() => setForm((prev) => ({ ...prev, graduationStatus: "graduated" }))}
                />
                {labels.graduated}
              </label>
            </div>
          </fieldset>
        ) : null}
        {visible.notes ? (
          <label className="student-info-form__field">
            {labels.notes}
            <textarea
              name="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </label>
        ) : null}
        {customFields.map((field) => (
          <label key={field.id} className="student-info-form__field">
            {field.label}
            <input
              required
              name={`custom-${field.id}`}
              value={form.customValues[field.id] ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  customValues: { ...prev.customValues, [field.id]: e.target.value },
                }))
              }
            />
          </label>
        ))}
        {visible.photo ? (
          <label className="student-info-form__field">
            {labels.photo}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading}
              onChange={(e) => {
                void handlePhotoChange(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
        ) : null}
        {visible.photo && form.photoUrl ? (
          <img src={form.photoUrl} alt="" className="student-info-form__photo" />
        ) : null}
        {uploading ? <p className="student-info-form__hint">{labels.uploading}</p> : null}
        {error ? <p className="student-info-form__error">{error}</p> : null}
      </form>
    </StudentShellModal>
  );
}
