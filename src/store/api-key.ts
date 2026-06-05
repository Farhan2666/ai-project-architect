import { create } from "zustand";
import { encryptApiKey, decryptApiKey } from "@/lib/crypto";

export type AIProvider = "openai" | "anthropic" | "gemini" | "openrouter" | "deepseek" | "groq" | "custom";

export interface ProviderInfo {
  id: AIProvider;
  label: string;
  format: string;
  pattern: RegExp;
  baseURL: string;
  defaultModel: string;
  models: string[];
  docsURL: string;
}

export const PROVIDER_LIST: ProviderInfo[] = [
  {
    id: "openai", label: "OpenAI", format: "sk-...", pattern: /^sk-/,
    baseURL: "", defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-nano", "o3", "o4-mini"],
    docsURL: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic", label: "Anthropic", format: "sk-ant-...", pattern: /^sk-ant-/,
    baseURL: "", defaultModel: "claude-sonnet-4-20250514",
    models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-latest", "claude-3-opus-latest"],
    docsURL: "https://console.anthropic.com/keys",
  },
  {
    id: "gemini", label: "Gemini", format: "AIza...", pattern: /^AIza/,
    baseURL: "", defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
    docsURL: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "openrouter", label: "OpenRouter", format: "sk-or-...", pattern: /^sk-or-/,
    baseURL: "https://openrouter.ai/api/v1", defaultModel: "google/gemini-2.5-flash",
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
  },
  {
    id: "deepseek", label: "DeepSeek", format: "sk-...", pattern: /^sk-/,
    baseURL: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    docsURL: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "groq", label: "Groq", format: "gsk_...", pattern: /^gsk_/,
    baseURL: "https://api.groq.com/openai/v1", defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
    docsURL: "https://console.groq.com/keys",
  },
  {
    id: "custom", label: "Custom", format: "API Key", pattern: /^.+$/,
    baseURL: "https://", defaultModel: "",
    models: [],
    docsURL: "",
  },
];

interface ApiKeyState {
  provider: AIProvider;
  apiKey: string;
  baseURL: string;
  model: string;
  isModalOpen: boolean;
  pinSet: boolean;
  setProvider: (provider: AIProvider) => void;
  setApiKey: (key: string) => void;
  setBaseURL: (url: string) => void;
  setModel: (model: string) => void;
  saveKey: (pin: string, provider: AIProvider, key: string, baseURL?: string, model?: string) => Promise<void>;
  loadKey: (pin: string) => Promise<boolean>;
  clearKey: () => void;
  openModal: () => void;
  closeModal: () => void;
  getDecryptedKey: (pin: string) => Promise<string>;
}

const STORAGE_KEY = "ai-project-architect-api-key-enc";
const STORAGE_PROVIDER_KEY = "ai-project-architect-provider";
const STORAGE_BASEURL_KEY = "ai-project-architect-baseurl";
const STORAGE_MODEL_KEY = "ai-project-architect-model";

function getProviderInfo(prov: AIProvider): ProviderInfo {
  return PROVIDER_LIST.find((p) => p.id === prov) || PROVIDER_LIST[0];
}

export const useApiKeyStore = create<ApiKeyState>((set, get) => ({
  provider: "openai",
  apiKey: "",
  baseURL: "",
  model: "gpt-4o",
  isModalOpen: true,
  pinSet: false,

  setProvider: (provider) => set((state) => {
    const info = getProviderInfo(provider);
    return {
      provider,
      baseURL: info.baseURL,
      model: state.model && info.models.includes(state.model) ? state.model : info.defaultModel,
    };
  }),

  setApiKey: (apiKey) => set({ apiKey }),
  setBaseURL: (baseURL) => set({ baseURL }),
  setModel: (model) => set({ model }),

  saveKey: async (pin, provider, key, baseURL, model) => {
    const info = getProviderInfo(provider);
    const url = baseURL ?? info.baseURL;
    const mdl = model ?? info.defaultModel;

    const encrypted = await encryptApiKey(pin, key);
    localStorage.setItem(STORAGE_KEY, encrypted);
    localStorage.setItem(STORAGE_PROVIDER_KEY, provider);
    localStorage.setItem(STORAGE_BASEURL_KEY, url);
    localStorage.setItem(STORAGE_MODEL_KEY, mdl);
    set({ provider, apiKey: key, baseURL: url, model: mdl, isModalOpen: false, pinSet: true });
  },

  loadKey: async (pin) => {
    if (typeof window === "undefined") return false;
    const encrypted = localStorage.getItem(STORAGE_KEY);
    const provider = localStorage.getItem(STORAGE_PROVIDER_KEY) as AIProvider | null;
    const baseURL = localStorage.getItem(STORAGE_BASEURL_KEY) || "";
    const model = localStorage.getItem(STORAGE_MODEL_KEY) || "";
    if (encrypted && provider) {
      try {
        const decrypted = await decryptApiKey(pin, encrypted);
        const info = getProviderInfo(provider);
        set({
          apiKey: decrypted, provider, baseURL,
          model: model || info.defaultModel,
          isModalOpen: false,
          pinSet: true,
        });
        return true;
      } catch {
        set({ isModalOpen: true, pinSet: false });
        return false;
      }
    }
    set({ isModalOpen: true });
    return false;
  },

  getDecryptedKey: async (pin: string) => {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) return "";
    return decryptApiKey(pin, encrypted);
  },

  clearKey: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_PROVIDER_KEY);
    localStorage.removeItem(STORAGE_BASEURL_KEY);
    localStorage.removeItem(STORAGE_MODEL_KEY);
    set({ apiKey: "", provider: "openai", baseURL: "", model: "", isModalOpen: true, pinSet: false });
  },

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
}));
