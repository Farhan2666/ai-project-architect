import { create } from "zustand";

export type AIProvider = "openai" | "anthropic" | "gemini" | "openrouter" | "deepseek" | "groq" | "custom";

export interface ProviderInfo {
  id: AIProvider;
  label: string;
  format: string;
  pattern: RegExp;
  baseURL: string;
  model: string;
  docsURL: string;
}

export const PROVIDER_LIST: ProviderInfo[] = [
  { id: "openai", label: "OpenAI", format: "sk-...", pattern: /^sk-/, baseURL: "", model: "gpt-4o", docsURL: "https://platform.openai.com/api-keys" },
  { id: "anthropic", label: "Anthropic", format: "sk-ant-...", pattern: /^sk-ant-/, baseURL: "", model: "claude-sonnet-4-20250514", docsURL: "https://console.anthropic.com/keys" },
  { id: "gemini", label: "Gemini", format: "AIza...", pattern: /^AIza/, baseURL: "", model: "gemini-2.5-flash", docsURL: "https://aistudio.google.com/app/apikey" },
  { id: "openrouter", label: "OpenRouter", format: "sk-or-...", pattern: /^sk-or-/, baseURL: "https://openrouter.ai/api/v1", model: "openai/gpt-4o", docsURL: "https://openrouter.ai/keys" },
  { id: "deepseek", label: "DeepSeek", format: "sk-...", pattern: /^sk-/, baseURL: "https://api.deepseek.com/v1", model: "deepseek-chat", docsURL: "https://platform.deepseek.com/api_keys" },
  { id: "groq", label: "Groq", format: "gsk_...", pattern: /^gsk_/, baseURL: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", docsURL: "https://console.groq.com/keys" },
  { id: "custom", label: "Custom", format: "API Key", pattern: /^.+$/, baseURL: "https://", model: "custom-model", docsURL: "" },
];

interface ApiKeyState {
  provider: AIProvider;
  apiKey: string;
  baseURL: string;
  isModalOpen: boolean;
  setProvider: (provider: AIProvider) => void;
  setApiKey: (key: string) => void;
  setBaseURL: (url: string) => void;
  saveKey: (provider: AIProvider, key: string, baseURL?: string) => void;
  loadKey: () => boolean;
  clearKey: () => void;
  openModal: () => void;
  closeModal: () => void;
}

const STORAGE_KEY = "ai-project-architect-api-key";
const STORAGE_PROVIDER_KEY = "ai-project-architect-provider";
const STORAGE_BASEURL_KEY = "ai-project-architect-baseurl";

function getProviderBaseURL(prov: AIProvider): string {
  return PROVIDER_LIST.find((p) => p.id === prov)?.baseURL || "";
}

export const useApiKeyStore = create<ApiKeyState>((set) => ({
  provider: "openai",
  apiKey: "",
  baseURL: "",
  isModalOpen: false,

  setProvider: (provider) => set((state) => ({
    provider,
    baseURL: getProviderBaseURL(provider),
  })),

  setApiKey: (apiKey) => set({ apiKey }),

  setBaseURL: (baseURL) => set({ baseURL }),

  saveKey: (provider, key, baseURL) => {
    const url = baseURL ?? getProviderBaseURL(provider);
    localStorage.setItem(STORAGE_KEY, key);
    localStorage.setItem(STORAGE_PROVIDER_KEY, provider);
    localStorage.setItem(STORAGE_BASEURL_KEY, url);
    set({ provider, apiKey: key, baseURL: url, isModalOpen: false });
  },

  loadKey: () => {
    if (typeof window === "undefined") return false;
    const key = localStorage.getItem(STORAGE_KEY);
    const provider = localStorage.getItem(STORAGE_PROVIDER_KEY) as AIProvider | null;
    const baseURL = localStorage.getItem(STORAGE_BASEURL_KEY) || "";
    if (key && provider) {
      set({ apiKey: key, provider, baseURL, isModalOpen: false });
      return true;
    }
    set({ isModalOpen: true });
    return false;
  },

  clearKey: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_PROVIDER_KEY);
    localStorage.removeItem(STORAGE_BASEURL_KEY);
    set({ apiKey: "", provider: "openai", baseURL: "", isModalOpen: true });
  },

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
}));
