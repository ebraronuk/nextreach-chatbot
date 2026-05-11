"use client";

import type { QuickReply } from "@/lib/conversation/types";

interface Props {
  replies: QuickReply[];
  onSelect: (reply: QuickReply) => void;
  disabled?: boolean;
}

export function QuickReplies({ replies, onSelect, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2 animate-fade-in" role="group" aria-label="Hizli cevap secenekleri">
      {replies.map((reply) => (
        <button
          key={reply.label}
          type="button"
          onClick={() => onSelect(reply)}
          disabled={disabled}
          className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs text-brand-700 hover:bg-brand-50 hover:border-brand-300 transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          {reply.label}
        </button>
      ))}
    </div>
  );
}
