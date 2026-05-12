"use client";

/**
 * NextReach Chatbot — ana komponent.
 *
 * Sorumluluklar:
 *   - Modal acma/kapama (FAB tetik + Escape + backdrop click)
 *   - Konusma state'i: state machine + localStorage persistance
 *   - Scripted akis (greeting -> summary -> submitted) yonetimi
 *   - Off-script kullanici input'unda Gemini'ye fallback (streaming)
 *   - A11y: focus trap, aria-live, klavye navigasyonu
 *
 * Lead'i Supabase'e yazmak BURADA degil — `submitted` step'inde leadData console'a
 * basiliyor, baska oturum /api/leads ile birlestirecek (bkz. CLAUDE.md task scope).
 */
import { MessageCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { ProactiveBubble } from "./ProactiveBubble";
import { QuickReplies } from "./QuickReplies";
import { TypingIndicator } from "./TypingIndicator";
import {
  buildBotUIMessage,
  buildUserUIMessage,
  createInitialState,
  handleUserInput,
  quickRepliesForStep,
} from "@/lib/conversation/state-machine";
import {
  clearConversation,
  loadConversation,
  saveConversation,
} from "@/lib/conversation/storage";
import type {
  ConversationState,
  QuickReply,
  Step,
  UIMessage,
} from "@/lib/conversation/types";
import { submitLead } from "@/lib/api/submitLead";
import { track } from "@/lib/analytics";

import { TYPING_DELAY_MS } from "@/constants/chat";

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ConversationState | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  // Refs
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ConversationState | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /**
   * Honeypot — bot otomatik form doldurucularinin tipik olarak doldurdugu
   * gizli alan. Insan kullanici asla goremez/dokunamaz (off-screen + aria-hidden
   * + tabIndex -1). Doluysa backend sessizce reject ediyor.
   */
  const honeypotRef = useRef<HTMLInputElement>(null);

  // State'i ref'te de tutuyoruz — async callback'lerde stale closure'a karsi
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // localStorage'dan ilk yukleme (sadece bir kez)
  useEffect(() => {
    const loaded = loadConversation();
    setState(loaded ?? createInitialState());
  }, []);

  // State degistikce kaydet
  useEffect(() => {
    if (state) saveConversation(state);
  }, [state]);

  // Auto scroll
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [state?.messages.length, isTyping, streamingId, open]);

  // Escape ile kapatma + focus trap
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    function focusableElements(): HTMLElement[] {
      if (!dialog) return [];
      return Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = focusableElements();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !active || !dialog?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);

    // Acildiktan sonra ilk focusable'a focus
    const focusTimer = setTimeout(() => {
      const node = dialogRef.current;
      if (!node) return;
      const focusables = focusableElements();
      // Input son eleman; close butonu yerine input'a focus daha akici
      const input = node.querySelector<HTMLTextAreaElement>("#chatbot-input");
      (input ?? focusables[0])?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      clearTimeout(focusTimer);
    };
  }, [open]);

  // Kapanirken trigger'a focus geri don
  useEffect(() => {
    if (!open && triggerRef.current && document.activeElement === document.body) {
      triggerRef.current.focus();
    }
  }, [open]);

  // Cleanup: outstanding stream'i iptal et
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  /** Kullanici aksiyonu (text gonder VEYA quick reply tikla). */
  const handleAction = useCallback(
    async (text: string, payload?: string) => {
      const current = stateRef.current;
      if (!current) return;
      const step = current.step;
      if (step === "submitted") return;

      // 1) User mesaji push
      const userMsg = buildUserUIMessage(text);
      const messagesAfterUser = stripTrailingQuickReplies(current.messages).concat(userMsg);
      const stateAfterUser: ConversationState = {
        ...current,
        messages: messagesAfterUser,
        lastActivityAt: new Date().toISOString(),
      };
      setState(stateAfterUser);
      stateRef.current = stateAfterUser;

      // 2) State machine'e sor
      const result = handleUserInput(step, { text, payload });

      // 3) Tip bazli aksiyon
      switch (result.kind) {
        case "advance":
        case "branch": {
          const nextLead = { ...stateAfterUser.leadData, ...result.updates };
          track("chat_step_entered", { from: step, to: result.nextStep });
          await playBotTurn(stateAfterUser, result.nextStep, nextLead);
          break;
        }
        case "submit": {
          const nextLead = { ...stateAfterUser.leadData, ...result.updates };
          await playBotTurn(stateAfterUser, "submitted", nextLead);

          // /api/leads'e fire-and-forget POST. Kullanici "Talebinizi olusturduk"
          // mesajini hemen goruyor — backend hatasi UI'i bloklamiyor.
          const durationSec = Math.round(
            (Date.now() - new Date(stateAfterUser.startedAt).getTime()) / 1000,
          );
          const transcript = (stateRef.current?.messages ?? []).map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          }));
          track("chat_submitted", {
            durationSec,
            volume: nextLead.volume,
            timeline: nextLead.timeline,
            intent: nextLead.intent,
          });
          void submitLead({
            leadData: nextLead,
            transcript,
            conversationDurationSec: durationSec,
            honeypot: honeypotRef.current?.value ?? "",
          }).then((r) => {
            if (!r.success) {
              console.warn("[chatbot] submitLead failed (UI not blocked):", r.message);
            }
          });
          break;
        }
        case "clarify": {
          await playBotClarify(stateAfterUser, result.botMessage);
          break;
        }
        case "fallback": {
          track("chat_fallback_triggered", { step });
          await playGeminiFallback(stateAfterUser);
          break;
        }
      }
    },
    [],
  );

  /** Asistan'in scripted bir cevabini "yaziyor" gostererek push eder. */
  async function playBotTurn(
    fromState: ConversationState,
    nextStep: Step,
    nextLead: ConversationState["leadData"],
  ) {
    setIsTyping(true);
    await sleep(TYPING_DELAY_MS);
    const botMsg = buildBotUIMessage(nextStep, nextLead);
    setIsTyping(false);
    const updated: ConversationState = {
      ...fromState,
      step: nextStep,
      leadData: nextLead,
      messages: [...fromState.messages, botMsg],
      lastActivityAt: new Date().toISOString(),
    };
    setState(updated);
    stateRef.current = updated;
  }

  /** Validasyon hatasi: ayni step'te kal, ek bot mesaji + ayni step'in quick replies'ini geri getir. */
  async function playBotClarify(fromState: ConversationState, botMessage: string) {
    setIsTyping(true);
    await sleep(TYPING_DELAY_MS);
    setIsTyping(false);
    const replies = quickRepliesForStep(fromState.step, fromState.leadData);
    const botMsg: UIMessage = {
      id: cryptoRandom(),
      role: "assistant",
      content: botMessage,
      quickReplies: replies,
      timestamp: new Date().toISOString(),
    };
    setState({
      ...fromState,
      messages: [...fromState.messages, botMsg],
      lastActivityAt: new Date().toISOString(),
    });
  }

  /** Gemini'ye konusma geçmişi gonder, streaming response'i UI'a yansit. */
  async function playGeminiFallback(fromState: ConversationState) {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setIsTyping(true);
    const placeholderId = cryptoRandom();
    let placeholderInjected = false;

    try {
      const lastUser = [...fromState.messages].reverse().find((m) => m.role === "user");
      if (!lastUser) {
        setIsTyping(false);
        return;
      }
      const history = fromState.messages
        .filter((m) => m !== lastUser)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history,
          userMessage: lastUser.content,
          step: fromState.step,
          leadData: fromState.leadData,
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`/api/chat ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        acc += chunk;

        if (!placeholderInjected) {
          placeholderInjected = true;
          setIsTyping(false);
          setStreamingId(placeholderId);
          setState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  id: placeholderId,
                  role: "assistant",
                  content: acc,
                  timestamp: new Date().toISOString(),
                  pending: true,
                },
              ],
            };
          });
        } else {
          setState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === placeholderId ? { ...m, content: acc } : m,
              ),
            };
          });
        }
      }

      // Stream bitti — pending kapat, ayni step'in quick replies'ini ekle (kullanici scripted akisa donebilsin)
      const replies = quickRepliesForStep(fromState.step, fromState.leadData);
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === placeholderId ? { ...m, pending: false, quickReplies: replies } : m,
          ),
          lastActivityAt: new Date().toISOString(),
        };
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("[chatbot] gemini fallback failed:", err);
      setIsTyping(false);
      setState((prev) => {
        if (!prev) return prev;
        const fallbackMsg: UIMessage = {
          id: cryptoRandom(),
          role: "assistant",
          content: "Ufak bir terslik oldu, tekrar dener misiniz?",
          timestamp: new Date().toISOString(),
          quickReplies: quickRepliesForStep(prev.step, prev.leadData),
        };
        return { ...prev, messages: [...prev.messages, fallbackMsg] };
      });
    } finally {
      setStreamingId(null);
      abortRef.current = null;
    }
  }

  function onUserSendText(text: string) {
    handleAction(text);
  }

  function onQuickReply(reply: QuickReply) {
    handleAction(reply.echo, reply.payload);
  }

  function onReset() {
    abortRef.current?.abort();
    clearConversation();
    setIsTyping(false);
    setStreamingId(null);
    setState(createInitialState());
  }

  // Render
  const messages = state?.messages ?? [];
  const lastMessage = messages[messages.length - 1];
  const lastQuickReplies = lastMessage?.role === "assistant" && !lastMessage.pending
    ? lastMessage.quickReplies
    : undefined;
  const isSubmitted = state?.step === "submitted";
  const inputDisabled = isTyping || streamingId !== null || isSubmitted;

  return (
    <>
      {/* Proaktif davet baloncuğu — kapatılmadıysa 4sn sonra çıkar */}
      {!open && <ProactiveBubble />}

      {/* Floating CTA */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen(true);
          track("chat_opened", { source: "fab" });
        }}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-medium text-white shadow-xl shadow-brand-600/30 hover:bg-brand-700 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        aria-label="Aylin ile sohbeti baslat"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <MessageCircle className="size-4" />
        Bize Ulaşın
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/30 sm:bg-transparent animate-fade-in"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="NextReach satis sohbeti"
            className="fixed z-50 inset-x-0 bottom-0 h-[88vh] sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[640px] sm:w-[420px] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 animate-slide-up overflow-hidden"
          >
            <ChatHeader onClose={() => setOpen(false)} />

            <div
              className="flex-1 overflow-y-auto chat-scroll px-4 py-4 space-y-4 bg-slate-50/40"
              aria-live="polite"
              aria-relevant="additions"
            >
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}

              {/* Quick replies bot'un en alt mesajinin altinda */}
              {lastQuickReplies && lastQuickReplies.length > 0 && (
                <div className="pl-1">
                  <QuickReplies
                    replies={lastQuickReplies}
                    onSelect={onQuickReply}
                    disabled={inputDisabled}
                  />
                </div>
              )}

              {isTyping && <TypingIndicator />}

              {isSubmitted && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={onReset}
                    className="text-xs text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 rounded"
                  >
                    Yeni bir sohbet baslat
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <ChatInput
              onSend={onUserSendText}
              disabled={inputDisabled}
              placeholder={
                isSubmitted ? "Sohbet tamamlandi" : "Mesajinizi yazin..."
              }
            />

            {/*
              Honeypot — bot'lar gizli alanlari doldurma egilimindedir.
              Insan kullanici goremez (off-screen + aria-hidden + tabIndex -1).
              Backend doluysa sessizce reject ediyor (200 doner, ama yazmaz).
            */}
            <input
              ref={honeypotRef}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              defaultValue=""
              className="absolute left-[-9999px] top-auto h-0 w-0 opacity-0"
            />
          </div>
        </>
      )}
    </>
  );
}

/* --------- helpers --------- */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function cryptoRandom(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Bir bot turu basladiginda, onceki asistan mesajinin quick replies'ini gizle
 * (kullanici cevabini verdi, eski chip'ler tiklanabilir kalmasin).
 */
function stripTrailingQuickReplies(messages: UIMessage[]): UIMessage[] {
  if (messages.length === 0) return messages;
  const last = messages[messages.length - 1];
  if (last.role !== "assistant" || !last.quickReplies) return messages;
  return [...messages.slice(0, -1), { ...last, quickReplies: undefined }];
}

