import { create } from "zustand";

type AIProvider = "openai" | "anthropic" | "gemini";

interface ApiKeyState {
  provider: AIProvider;
  apiKey: string;
  isModalOpen: boolean;
  setProvider: (provider: AIProvider) => void;
  setApiKey: (key: string) => void;
  saveKey: (provider: AIProvider, key: string) => void;
  loadKey: () => boolean;
  clearKey: () => void;
  openModal: () => void;
  closeModal: () => void;
}

const STORAGE_KEY = "ai-project-architect-api-key";
const STORAGE_PROVIDER_KEY = "ai-project-architect-provider";

export const useApiKeyStore = create<ApiKeyState>((set) => ({
  provider: "openai",
  apiKey: "",
  isModalOpen: false,

  setProvider: (provider) => set({ provider }),
  setApiKey: (apiKey) => set({ apiKey }),

  saveKey: (provider, key) => {
    localStorage.setItem(STORAGE_KEY, key);
    localStorage.setItem(STORAGE_PROVIDER_KEY, provider);
    set({ provider, apiKey: key, isModalOpen: false });
  },

  loadKey: () => {
    if (typeof window === "undefined") return false;
    const key = localStorage.getItem(STORAGE_KEY);
    const provider = localStorage.getItem(STORAGE_PROVIDER_KEY) as AIProvider | null;
    if (key && provider) {
      set({ apiKey: key, provider, isModalOpen: false });
      return true;
    }
    set({ isModalOpen: true });
    return false;
  },

  clearKey: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_PROVIDER_KEY);
    set({ apiKey: "", provider: "openai", isModalOpen: true });
  },

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
}));
