"use client";

import { useState, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiKeyStore, PROVIDER_LIST, AIProvider } from "@/store/api-key";
import { Key, Eye, EyeOff, ExternalLink, Sparkles, Lock } from "lucide-react";

type FormState = { error: string } | null;

async function submitAction(prev: FormState, formData: FormData): Promise<FormState> {
  const provider = formData.get("provider") as AIProvider;
  const apiKey = (formData.get("apiKey") as string)?.trim();
  const pin = (formData.get("pin") as string)?.trim();
  const baseURL = (formData.get("baseURL") as string)?.trim();
  const model = (formData.get("model") as string)?.trim();

  if (!pin || pin.length < 4) {
    return { error: "Master PIN minimal 4 karakter" };
  }
  if (!apiKey) {
    return { error: "API Key tidak boleh kosong" };
  }

  const info = PROVIDER_LIST.find((p) => p.id === provider) || PROVIDER_LIST[0];
  if (info.pattern && !info.pattern.test(apiKey)) {
    return { error: `Format tidak valid. Key ${info.label} biasanya dimulai dengan "${info.format}"` };
  }
  if (provider === "custom" && (!baseURL || baseURL === "https://")) {
    return { error: "Base URL wajib diisi untuk provider Custom" };
  }
  if (!model) {
    return { error: "Nama model tidak boleh kosong" };
  }

  try {
    await useApiKeyStore.getState().saveKey(pin, provider, apiKey, baseURL, model);
    return null;
  } catch {
    return { error: "Gagal menyimpan key terenkripsi" };
  }
}

export default function ByokModal() {
  const { provider, apiKey, baseURL, model, isModalOpen, pinSet, setProvider, setApiKey, setBaseURL, setModel, closeModal } = useApiKeyStore();
  const [showKey, setShowKey] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [localError, setLocalError] = useState("");
  const [pin, setPin] = useState("");
  const [pinMode, setPinMode] = useState<"unlock" | "setup">(() =>
    typeof window !== "undefined" && localStorage.getItem("ai-project-architect-api-key-enc") ? "unlock" : "setup"
  );
  const formRef = useRef<HTMLFormElement>(null);

  const KNOWN_PROVIDERS = PROVIDER_LIST.filter((p) => p.id !== "custom");

  const currentProvider = useMemo(
    () => PROVIDER_LIST.find((p) => p.id === provider) || PROVIDER_LIST[0],
    [provider]
  );

  const hasNoKey = !apiKey.trim() && isModalOpen && pinMode === "setup";

  const handleUnlock = async () => {
    if (!pin || pin.length < 4) {
      setLocalError("PIN minimal 4 karakter");
      return;
    }
    setLocalError("");
    const success = await useApiKeyStore.getState().loadKey(pin);
    if (!success) {
      setLocalError("PIN salah. Coba lagi.");
    }
  };

  const handleProviderChange = (p: AIProvider) => {
    setProvider(p);
    setPinMode("setup");
  };

  return (
    <Dialog
      open={isModalOpen}
      onOpenChange={(open) => {
        if (!open && !hasNoKey && (apiKey.trim() || pinMode === "setup")) {
          closeModal();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            {pinMode === "unlock" ? "Unlock API Key" : "Setup API Key"}
          </DialogTitle>
          <DialogDescription>
            {pinMode === "unlock"
              ? "Masukkan Master PIN untuk mendekripsi API Key yang tersimpan."
              : "Buat Master PIN untuk mengenkripsi API Key. Key akan dienkripsi AES-256-GCM."}
          </DialogDescription>
        </DialogHeader>

        {pinMode === "unlock" ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Master PIN</label>
              <div className="relative">
                <Input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Masukkan PIN 4+ karakter"
                  className="pr-10"
                  onKeyDown={(e) => { if (e.key === "Enter") handleUnlock(); }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {localError && <p className="text-xs text-destructive mt-1">{localError}</p>}
            </div>

            <Button onClick={handleUnlock} className="w-full">
              <Lock className="w-4 h-4" />
              Buka Kunci
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { localStorage.removeItem("ai-project-architect-api-key-enc"); useApiKeyStore.getState().clearKey(); setPinMode("setup"); setPin(""); setLocalError(""); }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Atur ulang (hapus key tersimpan)
              </button>
            </div>
          </div>
        ) : (
          <form
            ref={formRef}
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              const result = await submitAction(null, fd);
              if (result?.error) {
                setLocalError(result.error);
              }
            }}
            className="space-y-4"
          >
            <input type="hidden" name="provider" value={provider} />
            <input type="hidden" name="baseURL" value={baseURL} />
            <input type="hidden" name="model" value={model} />

            <div>
              <label className="text-sm font-medium mb-1.5 block">Penyedia AI</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {KNOWN_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderChange(p.id as AIProvider)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                      provider === p.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleProviderChange("custom")}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                    provider === "custom"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Master PIN</label>
              <div className="relative">
                <Input
                  type={showPin ? "text" : "password"}
                  name="pin"
                  placeholder="Buat PIN 4+ karakter (untuk enkripsi)"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">API Key</label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  name="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={currentProvider.format}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {localError && <p className="text-xs text-destructive mt-1">{localError}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Model
              </label>
              <Input
                type="text"
                name="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={currentProvider.defaultModel || "custom-model-name"}
                className="font-mono text-xs"
              />
              {currentProvider.models.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {currentProvider.models.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModel(m)}
                      className={`text-[10px] px-2 py-1 rounded-md border transition-all ${
                        model === m
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Base URL <span className="text-[10px] text-muted-foreground font-normal">(opsional)</span>
              </label>
              <Input
                type="text"
                name="baseURL"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder={currentProvider.baseURL || "https://api.openai.com/v1"}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              {currentProvider.docsURL && (
                <a
                  href={currentProvider.docsURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Dapatkan API Key {currentProvider.label}
                </a>
              )}
            </div>

            <Button type="submit" className="w-full">
              <Lock className="w-4 h-4" />
              Enkripsi & Simpan
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              Key dienkripsi AES-256-GCM + PBKDF2. Hanya disimpan di browser.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
