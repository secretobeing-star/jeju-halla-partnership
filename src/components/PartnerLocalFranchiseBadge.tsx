type PartnerLocalFranchiseBadgeProps = {
  show?: boolean;
  className?: string;
};

export default function PartnerLocalFranchiseBadge({
  show = false,
  className = "",
}: PartnerLocalFranchiseBadgeProps) {
  if (!show) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center rounded-md bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800 ${className}`.trim()}
      title="지역화폐 가맹점으로 등록된 업체입니다."
    >
      지역화폐
    </span>
  );
}
