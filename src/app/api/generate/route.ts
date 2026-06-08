import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getPipelineSystemPrompt } from "@/utils/pipeline";
import { rateLimit } from "@/lib/rate-limit";
import { getProviderConfig } from "@/lib/provider-registry";

// Endpoint khusus untuk Auto Generate All
// Menggunakan toTextStreamResponse() sehingga client bisa baca plain text
// (lebih simpel dari toUIMessageStreamResponse yang butuh parsing protokol khusus)
export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key") || "";
    const provider = req.headers.get("x-provider") || "openai";
    const baseURL = req.headers.get("x-base-url") || undefined;
    const model = req.headers.get("x-model") || "gpt-4o";

    const { prompt, stage } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt diperlukan" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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
      return new Response(JSON.stringify({ error: "Too many requests. Silakan tunggu sebentar." }), {
        status: 429,
        headers: { "Content-Type": "application/json", "X-RateLimit-Remaining": "0" },
      });
    }

    const config = getProviderConfig(provider as any);
    const effectiveBaseURL = baseURL || config.baseURL || undefined;
    const modelName = model || config.defaultModel;

    // Untuk competitive analysis (stage -1 atau undefined), pakai system prompt umum
    // Untuk stage 0–5, pakai system prompt spesifik per stage
    // Gunakan isMagicMode = true agar AI langsung menghasilkan dokumen final tanpa interaksi
    const stageIndex = typeof stage === "number" ? stage : 0;
    const systemPrompt = getPipelineSystemPrompt(stageIndex, true);

    let llmModel;
    if (config.sdkType === "anthropic") {
      const client = createAnthropic({ apiKey, baseURL: effectiveBaseURL });
      llmModel = client(modelName);
    } else if (config.sdkType === "gemini") {
      const client = createGoogleGenerativeAI({ apiKey, baseURL: effectiveBaseURL });
      llmModel = client(modelName);
    } else {
      const client = createOpenAI({ apiKey, baseURL: effectiveBaseURL });
      llmModel = client.chat(modelName);
    }

    const result = streamText({
      model: llmModel,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    // Gunakan toTextStreamResponse() → plain text stream, mudah dibaca client
    const response = result.toTextStreamResponse();
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
