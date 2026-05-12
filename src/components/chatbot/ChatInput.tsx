"use client";

import { Send } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = "Mesajınızı yazın..." }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /**
   * IME composition guard — TR/JP/CN/KO klavyelerde compose sirasinda Enter
   * "kelime tamamla" anlamina gelir; biz mesaji "gonder" diye yorumlamamaliyiz.
   */
  const composingRef = useRef(false);
  /**
   * Disabled true -> false geçişinde input'a focus geri don.
   * Kullanıcı mesaj attığında textarea anlık disabled olur (Aylin yazıyor...),
   * sonra tekrar açılır. Default davranış: focus kaybolur. Biz istemiyoruz —
   * akış bozulmasın diye otomatik geri çağırıyoruz.
   */
  const prevDisabledRef = useRef<boolean | undefined>(disabled);

  useEffect(() => {
    if (prevDisabledRef.current === true && !disabled) {
      // Disabled'dan aktife döndü — odağı geri al
      textareaRef.current?.focus();
    }
    prevDisabledRef.current = disabled;
  }, [disabled]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // Send butonuna tıklayanlar için focus'u textarea'da tut.
    // Enter ile gönderirken zaten textarea odakta — gereksiz çağrı zarar vermez.
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !composingRef.current) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-end gap-2 border-t border-slate-200 bg-white p-3"
    >
      <label className="sr-only" htmlFor="chatbot-input">
        Mesajınızı yazın
      </label>
      <textarea
        ref={textareaRef}
        id="chatbot-input"
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        onCompositionStart={() => (composingRef.current = true)}
        onCompositionEnd={() => (composingRef.current = false)}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 outline-none transition max-h-32 disabled:opacity-60 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={disabled || value.trim().length === 0}
        className="shrink-0 rounded-full bg-brand-600 p-2.5 text-white hover:bg-brand-700 transition shadow-md shadow-brand-500/30 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        aria-label="Gönder"
      >
        <Send className="size-4" />
      </button>
    </form>
  );
}
