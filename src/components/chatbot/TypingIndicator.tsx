"use client";

export function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1 self-start rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 animate-fade-in"
      role="status"
      aria-label="Aylin yaziyor"
    >
      <span className="size-1.5 rounded-full bg-slate-400 animate-typing-dot" style={{ animationDelay: "0ms" }} />
      <span className="size-1.5 rounded-full bg-slate-400 animate-typing-dot" style={{ animationDelay: "200ms" }} />
      <span className="size-1.5 rounded-full bg-slate-400 animate-typing-dot" style={{ animationDelay: "400ms" }} />
    </div>
  );
}
