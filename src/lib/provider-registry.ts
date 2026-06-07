export type AIProvider = "openai" | "anthropic" | "gemini" | "openrouter" | "deepseek" | "groq" | "custom";

export interface ProviderConfig {
  id: AIProvider;
  label: string;
  keyFormat: string;
  keyPattern: RegExp;
  baseURL: string;
  defaultModel: string;
  models: string[];
  docsURL: string;
  sdkType: "openai" | "anthropic" | "gemini";
  apiBaseURL?: string;
}

export const PROVIDER_REGISTRY: Record<AIProvider, ProviderConfig> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    keyFormat: "sk-...",
    keyPattern: /^sk-/,
    baseURL: "",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-nano", "o3", "o4-mini"],
    docsURL: "https://platform.openai.com/api-keys",
    sdkType: "openai",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    keyFormat: "sk-ant-...",
    keyPattern: /^sk-ant-/,
    baseURL: "",
    defaultModel: "claude-sonnet-4-20250514",
    models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-latest", "claude-3-opus-latest"],
    docsURL: "https://console.anthropic.com/keys",
    sdkType: "anthropic",
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    keyFormat: "AIza...",
    keyPattern: /^AIza/,
    baseURL: "",
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
    docsURL: "https://aistudio.google.com/app/apikey",
    sdkType: "gemini",
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    keyFormat: "sk-or-...",
    keyPattern: /^sk-or-/,
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-2.5-flash",
    models: [
      "google/gemini-2.5-flash",
      "google/gemini-2.0-flash",
      "meta-llama/llama-4-scout",
      "mistralai/mistral-7b-instruct",
      "deepseek/deepseek-chat",
      "qwen/qwen-2.5-72b-instruct",
      "cohere/command-r7b-12-2024",
      "nousresearch/hermes-3-llama-3.1-405b",
    ],
    docsURL: "https://openrouter.ai/keys",
    sdkType: "openai",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    keyFormat: "sk-...",
    keyPattern: /^sk-/,
    baseURL: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    docsURL: "https://platform.deepseek.com/api_keys",
    sdkType: "openai",
  },
  groq: {
    id: "groq",
    label: "Groq",
    keyFormat: "gsk_...",
    keyPattern: /^gsk_/,
    baseURL: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
    docsURL: "https://console.groq.com/keys",
    sdkType: "openai",
  },
  custom: {
    id: "custom",
    label: "Custom",
    keyFormat: "API Key",
    keyPattern: /^.+$/,
    baseURL: "https://",
    defaultModel: "",
    models: [],
    docsURL: "",
    sdkType: "openai",
  },
};

export const PROVIDER_LIST = Object.values(PROVIDER_REGISTRY);

export function getProviderConfig(provider: AIProvider): ProviderConfig {
  return PROVIDER_REGISTRY[provider] || PROVIDER_REGISTRY.openai;
}
