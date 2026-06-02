import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { SYSTEM_PROMPTS } from "@/lib/system-prompts";

function getClient(provider: string, apiKey: string) {
  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey });
    case "gemini":
      return createGoogleGenerativeAI({ apiKey });
    default:
      return createOpenAI({ apiKey });
  }
}

function getModel(provider: string) {
  switch (provider) {
    case "anthropic": return "claude-sonnet-4-20250514";
    case "gemini": return "gemini-2.5-flash";
    default: return "gpt-4o";
  }
}

export async function POST(req: Request) {
  try {
    const { messages, provider, apiKey, stage } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key diperlukan" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const client = getClient(provider, apiKey);
    const modelName = getModel(provider);
    const systemPrompt = SYSTEM_PROMPTS[stage as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS[0];
    const model = client(modelName);

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
