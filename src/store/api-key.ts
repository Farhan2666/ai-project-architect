import { create } from "zustand";
import { encryptApiKey, decryptApiKey } from "@/lib/crypto";
import { PROVIDER_REGISTRY, type AIProvider } from "@/lib/provider-registry";

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

export const useApiKeyStore = create<ApiKeyState>((set, get) => ({
  provider: "openai",
  apiKey: "",
  baseURL: "",
  model: "gpt-4o",
  isModalOpen: true,
  pinSet: false,

  setProvider: (provider) => set((state) => {
    const info = PROVIDER_REGISTRY[provider];
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
    const info = PROVIDER_REGISTRY[provider];
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
        const info = PROVIDER_REGISTRY[provider];
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
