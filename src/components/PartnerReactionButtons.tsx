"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getPartnerVoterKey,
  getStoredPartnerReaction,
  setStoredPartnerReaction,
} from "@/lib/partner-voter";

type PartnerReactionButtonsProps = {
  partnerId: string;
  likeCount: number;
  enabled: boolean;
  onCountsChange: (partnerId: string, likeCount: number) => void;
};

export default function PartnerReactionButtons({
  partnerId,
  likeCount,
  enabled,
  onCountsChange,
}: PartnerReactionButtonsProps) {
  const [userReaction, setUserReaction] = useState<"like" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setUserReaction(getStoredPartnerReaction(partnerId));
  }, [partnerId]);

  if (!enabled) {
    return null;
  }

  async function handleLike() {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    const { data, error } = await supabase.rpc("react_partner", {
      p_partner_id: partnerId,
      p_reaction: "like",
      p_voter_key: getPartnerVoterKey(),
    });

    setSubmitting(false);

    if (error) {
      return;
    }

    const result = data as {
      like_count: number;
      reaction: "like" | "dislike" | null;
    };

    const reaction = result.reaction === "like" ? "like" : null;
    onCountsChange(partnerId, result.like_count);
    setUserReaction(reaction);
    setStoredPartnerReaction(partnerId, reaction);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={submitting}
        onClick={() => void handleLike()}
        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium sm:px-3 sm:py-2 sm:text-sm ${
          userReaction === "like"
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        } disabled:opacity-60`}
      >
        추천 {likeCount}
      </button>
    </div>
  );
}
