import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getPipelineSystemPrompt } from "@/utils/pipeline";
import { rateLimit } from "@/lib/rate-limit";

const PROVIDER_CONFIG: Record<string, { type: "openai" | "anthropic" | "gemini"; baseURL?: string }> = {
  openai: { type: "openai" },
  anthropic: { type: "anthropic" },
  gemini: { type: "gemini" },
  openrouter: { type: "openai", baseURL: "https://openrouter.ai/api/v1" },
  deepseek: { type: "openai", baseURL: "https://api.deepseek.com/v1" },
  groq: { type: "openai", baseURL: "https://api.groq.com/openai/v1" },
};

function toCoreMessage(msg: any): { role: string; content: string } {
  const text = msg.parts
    ?.filter((p: any) => p.type === "text")
    .map((p: any) => p.text)
    .join("") ?? msg.content ?? "";
  return { role: msg.role ?? "user", content: text };
}

export async function POST(req: Request) {
  try {
    const { messages, provider, model, apiKey, baseURL, stage } = await req.json();
    const coreMessages = (messages ?? []).map(toCoreMessage);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key diperlukan" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rlKey = `${ip}:${apiKey.slice(0, 8)}`;
    const { allowed, remaining } = await rateLimit(rlKey);

    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Silakan tunggu." }), {
        status: 429,
        headers: { "Content-Type": "application/json", "X-RateLimit-Remaining": "0" },
      });
    }

    const config = PROVIDER_CONFIG[provider] || { type: "openai" as const };
    const effectiveBaseURL = baseURL || config.baseURL || undefined;
    const modelName = model || "gpt-4o";
    const systemPrompt = getPipelineSystemPrompt(stage ?? 0);

    const stageCompleteTool = {
      type: "function" as const,
      name: "finalize_stage",
      description: "Call this when the current stage is complete and ready to move to the next stage.",
      parameters: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Brief summary of what was accomplished in this stage.",
          },
        },
        required: ["summary"],
      },
    };

    let llmModel;

    if (config.type === "anthropic") {
      const client = createAnthropic({ apiKey, baseURL: effectiveBaseURL });
      llmModel = client(modelName);
    } else if (config.type === "gemini") {
      const client = createGoogleGenerativeAI({ apiKey, baseURL: effectiveBaseURL });
      llmModel = client(modelName);
    } else {
      const client = createOpenAI({ apiKey, baseURL: effectiveBaseURL });
      llmModel = client.chat(modelName);
    }

    const result = streamText({
      model: llmModel,
      system: systemPrompt,
      messages: coreMessages,
      tools: {
        finalize_stage: stageCompleteTool,
      },
      maxSteps: 5,
    });

    const response = result.toUIMessageStreamResponse();
    const headers = new Headers(response.headers);
    headers.set("X-RateLimit-Remaining", String(remaining));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
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
