"use client";

import { cn } from "@/lib/utils";
import type { UIMessage } from "@/lib/conversation/types";

interface Props {
  message: UIMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const time = formatTime(message.timestamp);

  return (
    <div
      className={cn("flex flex-col animate-fade-in", isUser ? "items-end" : "items-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words",
          isUser
            ? "bg-brand-600 text-white rounded-tr-md"
            : "bg-slate-100 text-slate-700 rounded-tl-md",
        )}
      >
        {message.content || (message.pending ? "…" : "")}
      </div>
      <span className="mt-1 px-2 text-[11px] text-slate-400 select-none">{time}</span>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}
