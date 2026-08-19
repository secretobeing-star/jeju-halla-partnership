type PopupNavChevronProps = {
  direction: "prev" | "next";
};

export default function PopupNavChevron({ direction }: PopupNavChevronProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="board-post-popup-nav-icon"
      aria-hidden
    >
      {direction === "prev" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}
