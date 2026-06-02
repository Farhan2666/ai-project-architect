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

export async function POST(req: Request) {
  try {
    const { messages, provider, model, apiKey, baseURL, stage } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key diperlukan" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
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

    return result.toTextStreamResponse();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
