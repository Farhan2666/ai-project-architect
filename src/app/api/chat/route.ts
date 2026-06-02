import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { SYSTEM_PROMPTS } from "@/lib/system-prompts";

const PROVIDER_CONFIG: Record<string, { type: "openai" | "anthropic" | "gemini"; baseURL?: string }> = {
  openai: { type: "openai" },
  anthropic: { type: "anthropic" },
  gemini: { type: "gemini" },
  openrouter: { type: "openai", baseURL: "https://openrouter.ai/api/v1" },
  deepseek: { type: "openai", baseURL: "https://api.deepseek.com/v1" },
  groq: { type: "openai", baseURL: "https://api.groq.com/openai/v1" },
};

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  return { allowed: entry.count <= RATE_LIMIT_MAX, remaining };
}

export async function POST(req: Request) {
  try {
    const { messages, provider, model, apiKey, baseURL, stage } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key diperlukan" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rlKey = `${ip}:${apiKey.slice(0, 8)}`;
    const { allowed, remaining } = rateLimit(rlKey);

    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Silakan tunggu." }), {
        status: 429,
        headers: { "Content-Type": "application/json", "X-RateLimit-Remaining": "0" },
      });
    }

    const config = PROVIDER_CONFIG[provider] || { type: "openai" as const };
    const effectiveBaseURL = baseURL || config.baseURL || undefined;
    const modelName = model || "gpt-4o";
    const systemPrompt = SYSTEM_PROMPTS[stage as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS[0];

    let llmModel;

    if (config.type === "anthropic") {
      const client = createAnthropic({ apiKey });
      llmModel = client(modelName);
    } else if (config.type === "gemini") {
      const client = createGoogleGenerativeAI({ apiKey });
      llmModel = client(modelName);
    } else {
      const client = createOpenAI({ apiKey, baseURL: effectiveBaseURL });
      llmModel = client(modelName);
    }

    const result = streamText({
      model: llmModel,
      system: systemPrompt,
      messages,
    });

    const stream = result.toTextStreamResponse();
    const headers = new Headers(stream.headers);
    headers.set("X-RateLimit-Remaining", String(remaining));

    return new Response(stream.body, {
      status: stream.status,
      statusText: stream.statusText,
      headers,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
