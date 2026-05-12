"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onClose: () => void;
}

export function ChatHeader({ onClose }: Props) {
  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white p-4">
      <div
        className="size-10 rounded-full bg-gradient-to-br from-brand-600 via-blue-500 to-cyan-400 shadow-lg shadow-brand-500/30 flex items-center justify-center text-white font-semibold text-sm"
        aria-hidden
      >
        A
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm leading-tight">
          Aylin · NextReach
        </p>
        <p className="text-xs text-slate-500 leading-tight flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden />
          Genelde 1 dakika icinde cevaplar
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Sohbeti kapat"
        className="text-slate-400 hover:text-slate-700 hover:bg-slate-100"
      >
        <X className="size-4" />
      </Button>
    </header>
  );
}
