type AdminActionReasonNoticeProps = {
  reason?: string | null;
  className?: string;
};

export default function AdminActionReasonNotice({
  reason,
  className = "",
}: AdminActionReasonNoticeProps) {
  const text = reason?.trim();
  if (!text) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border border-red-200 bg-red-50 p-3 ${className}`.trim()}
      role="note"
      aria-label="정지 사유"
    >
      <p className="text-xs font-semibold text-red-800">정지 사유</p>
      <p className="mt-1 whitespace-pre-line text-sm text-red-900">{text}</p>
    </div>
  );
}
