/**
 * Lead/Conversation tipleri.
 * Supabase tablo semasi ile birebir uyumlu olmali.
 */

export type Volume = "<500" | "500-5k" | "5k-50k" | "50k+";
export type Timeline = "this-week" | "this-month" | "this-quarter" | "researching";
export type Temperature = "hot" | "warm" | "cold";
export type Intent = "demo" | "pricing" | "integration" | "support" | "other";

export interface LeadInput {
  name: string;
  company: string;
  email: string;
  phone?: string;
  intent?: Intent;
  volume?: Volume;
  currentTool?: string;
  timeline?: Timeline;
  preferredContactTime?: string;
  conversationDurationSec?: number;
}

export interface Lead extends LeadInput {
  id: string;
  createdAt: string;
  score: number;
  temperature: Temperature;
  scoreBreakdown: Array<{ reason: string; delta: number }>;
  aiSummary?: string;
  transcript: ChatMessage[];
  ipHash?: string;
  userAgent?: string;
  status: "new" | "contacted" | "qualified" | "rejected";
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}
