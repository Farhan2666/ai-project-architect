import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { SYSTEM_PROMPTS } from "@/lib/system-prompts";

const PROVIDER_CONFIG: Record<string, { type: "openai" | "anthropic" | "gemini"; baseURL?: string; model: string }> = {
  openai: { type: "openai", model: "gpt-4o" },
  anthropic: { type: "anthropic", model: "claude-sonnet-4-20250514" },
  gemini: { type: "gemini", model: "gemini-2.5-flash" },
  openrouter: { type: "openai", baseURL: "https://openrouter.ai/api/v1", model: "openai/gpt-4o" },
  deepseek: { type: "openai", baseURL: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  groq: { type: "openai", baseURL: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
};

export async function POST(req: Request) {
  try {
    const { messages, provider, apiKey, baseURL, stage } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key diperlukan" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const config = PROVIDER_CONFIG[provider] || { type: "openai" as const, model: "gpt-4o" };
    const effectiveBaseURL = baseURL || config.baseURL || undefined;
    const systemPrompt = SYSTEM_PROMPTS[stage as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS[0];

    let model;

    if (config.type === "anthropic") {
      const client = createAnthropic({ apiKey });
      model = client(config.model);
    } else if (config.type === "gemini") {
      const client = createGoogleGenerativeAI({ apiKey });
      model = client(config.model);
    } else {
      const client = createOpenAI({ apiKey, baseURL: effectiveBaseURL });
      model = client(config.model);
    }

    const result = streamText({
      model,
      system: systemPrompt,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
