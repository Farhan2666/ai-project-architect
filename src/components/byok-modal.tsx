"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiKeyStore } from "@/store/api-key";
import { Key, Eye, EyeOff, ExternalLink } from "lucide-react";

const PROVIDERS = [
  { id: "openai" as const, label: "OpenAI", format: "sk-...", pattern: /^sk-/ },
  { id: "anthropic" as const, label: "Anthropic", format: "sk-ant-...", pattern: /^sk-ant-/ },
  { id: "gemini" as const, label: "Gemini", format: "AIza...", pattern: /^AIza/ },
];

export default function ByokModal() {
  const { provider, apiKey, isModalOpen, setProvider, setApiKey, saveKey } = useApiKeyStore();
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");

  const currentProvider = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];

  const handleSave = () => {
    const key = apiKey.trim();
    if (!key) {
      setError("API Key tidak boleh kosong");
      return;
    }
    const prov = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];
    if (prov.pattern && !prov.pattern.test(key)) {
      setError(`Format tidak valid. Key ${prov.label} biasanya dimulai dengan "${prov.format}"`);
      return;
    }
    setError("");
    saveKey(provider, key);
  };

  const hasNoKey = !apiKey.trim() && isModalOpen;

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open && !hasNoKey) useApiKeyStore.getState().closeModal(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Setup API Key
          </DialogTitle>
          <DialogDescription>
            Masukkan API Key dari penyedia AI favoritmu. Key ini disimpan aman di browser localStorage-mu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Penyedia AI</label>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    provider === p.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">API Key</label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
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
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={
                provider === "openai"
                  ? "https://platform.openai.com/api-keys"
                  : provider === "anthropic"
                  ? "https://console.anthropic.com/keys"
                  : "https://aistudio.google.com/app/apikey"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Dapatkan API Key {currentProvider.label}
            </a>
          </div>

          <Button onClick={handleSave} className="w-full">
            <Key className="w-4 h-4" />
            Simpan Key
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            Key hanya disimpan di browser localStorage-mu. Tidak pernah dikirim ke server kami.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
