import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getPipelineSystemPrompt } from "@/utils/pipeline";
import { rateLimit } from "@/lib/rate-limit";
import { getProviderConfig } from "@/lib/provider-registry";

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key") || "";
    const provider = req.headers.get("x-provider") || "openai";
    const baseURL = req.headers.get("x-base-url") || undefined;
    const model = req.headers.get("x-model") || "gpt-4o";

    const { messages, stage, previousStageSummaries } = await req.json();

    // FIX: Hapus system messages dari client — server sudah inject via parameter `system:`
    // Ini mencegah duplikasi system prompt yang bikin AI bingung
    const coreMessages = (messages ?? [])
      .filter((msg: any) => msg.role !== "system")
      .map((msg: any) => {
        const text = msg.parts
          ?.filter((p: any) => p.type === "text")
          .map((p: any) => p.text)
          .join("") ?? msg.content ?? "";
        return { role: msg.role ?? "user", content: text };
      });

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

    const config = getProviderConfig(provider as any);
    const effectiveBaseURL = baseURL || config.baseURL || undefined;
    const modelName = model || config.defaultModel;
    const lastUserMsg = coreMessages.filter((m: { role: string }) => m.role === "user").pop()?.content ?? "";
    const isMagicMode = lastUserMsg.startsWith("[MODE MAGIC]");

    // FIX: Gunakan stage yang dikirim client; default ke 0 jika undefined
    const activeStage = stage ?? 0;
    const systemPrompt = getPipelineSystemPrompt(activeStage, isMagicMode);

    // FIX: Untuk stage 5 (Task Breakdown), inject ringkasan dari semua stage sebelumnya
    // supaya AI punya konteks lengkap untuk membuat task breakdown yang akurat
    let fullSystem = systemPrompt;
    if (activeStage === 5 && previousStageSummaries && Object.keys(previousStageSummaries).length > 0) {
      const stageNames: Record<string, string> = {
        brand: "Brand & Identity",
        prd: "PRD (Product Requirements)",
        srs: "SRS (System Requirements)",
        sdd: "SDD (System Design)",
        ux: "UI/UX Flow",
      };
      const contextLines = Object.entries(previousStageSummaries as Record<string, string>)
        .filter(([, summary]) => summary && summary.trim())
        .map(([key, summary]) => `### ${stageNames[key] || key}\n${summary}`)
        .join("\n\n");

      if (contextLines) {
        fullSystem += `\n\n---\n## KONTEKS DARI STAGE SEBELUMNYA\nBerikut adalah ringkasan dari diskusi dan keputusan yang telah dibuat di stage-stage sebelumnya. Gunakan ini sebagai referensi untuk membuat task breakdown yang akurat dan relevan:\n\n${contextLines}`;
      }
    }

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
      system: fullSystem,
      messages: coreMessages,
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
