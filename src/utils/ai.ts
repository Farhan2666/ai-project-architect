"use client";

import { getProviderConfig, type AIProvider } from "@/lib/provider-registry";

interface ProviderEndpoint {
  url: string;
  headers: Record<string, string>;
  transformBody: (messages: { role: string; content: string }[], model: string) => unknown;
  extractContent: (data: unknown) => string;
}

const PROVIDER_ENDPOINTS: Record<string, ProviderEndpoint> = {
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    headers: {},
    transformBody: (messages, model) => ({ model, messages, stream: true }),
    extractContent: (data: any) => data?.choices?.[0]?.delta?.content ?? data?.choices?.[0]?.message?.content ?? "",
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    headers: { "anthropic-version": "2023-06-01" },
    transformBody: (messages, model) => {
      const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
      const msgs = messages.filter((m) => m.role !== "system").map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));
      return { model, system, messages: msgs, stream: true };
    },
    extractContent: (data: any) => data?.delta?.text ?? data?.content?.[0]?.text ?? "",
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/models",
    headers: {},
    transformBody: (messages, model) => ({
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    }),
    extractContent: (data: any) => data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    headers: { "HTTP-Referer": "https://ai-project-architect.vercel.app", "X-Title": "AI Project Architect" },
    transformBody: (messages, model) => ({ model, messages, stream: true }),
    extractContent: (data: any) => data?.choices?.[0]?.delta?.content ?? data?.choices?.[0]?.message?.content ?? "",
  },
  deepseek: {
    url: "https://api.deepseek.com/v1/chat/completions",
    headers: {},
    transformBody: (messages, model) => ({ model, messages, stream: true }),
    extractContent: (data: any) => data?.choices?.[0]?.delta?.content ?? data?.choices?.[0]?.message?.content ?? "",
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    headers: {},
    transformBody: (messages, model) => ({ model, messages, stream: true }),
    extractContent: (data: any) => data?.choices?.[0]?.delta?.content ?? data?.choices?.[0]?.message?.content ?? "",
  },
};

export function getProviderConfigOld(provider: AIProvider, baseURL?: string) {
  const cfg = PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.openai;
  return {
    ...cfg,
    url: baseURL || cfg.url,
  };
}

export function buildFetchPayload(
  provider: AIProvider,
  messages: { role: string; content: string }[],
  model: string,
  baseURL?: string,
) {
  const info = getProviderConfig(provider);
  const cfg = PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.openai;
  const url = baseURL || info.baseURL || cfg.url;

  return {
    url: url.endsWith("/chat/completions")
      ? url
      : provider === "gemini"
        ? `${url}/${model}:streamGenerateContent?alt=sse`
        : `${url}/chat/completions`,
    headers: cfg.headers,
    body: cfg.transformBody(messages, model) as Record<string, unknown>,
    extract: cfg.extractContent,
  };
}
