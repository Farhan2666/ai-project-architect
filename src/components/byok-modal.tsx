"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiKeyStore, PROVIDER_LIST, AIProvider } from "@/store/api-key";
import { Key, Eye, EyeOff, ExternalLink } from "lucide-react";

export default function ByokModal() {
  const { provider, apiKey, baseURL, isModalOpen, setProvider, setApiKey, setBaseURL, saveKey } = useApiKeyStore();
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");

  const KNOWN_PROVIDERS = PROVIDER_LIST.filter((p) => p.id !== "custom");

  const currentProvider = useMemo(
    () => PROVIDER_LIST.find((p) => p.id === provider) || PROVIDER_LIST[0],
    [provider]
  );

  const handleSave = () => {
    const key = apiKey.trim();
    if (!key) {
      setError("API Key tidak boleh kosong");
      return;
    }
    if (currentProvider.pattern && !currentProvider.pattern.test(key)) {
      setError(`Format tidak valid. Key ${currentProvider.label} biasanya dimulai dengan "${currentProvider.format}"`);
      return;
    }
    if (provider === "custom" && (!baseURL.trim() || baseURL.trim() === "https://")) {
      setError("Base URL wajib diisi untuk provider Custom");
      return;
    }
    setError("");
    saveKey(provider, key, baseURL || undefined);
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
              {KNOWN_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id as AIProvider)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
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
                onClick={() => setProvider("custom")}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
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

          <div>
            <label className="text-sm font-medium mb-1.5 block">Base URL</label>
            <Input
              type="text"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder={currentProvider.baseURL || "https://api.openai.com/v1"}
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Biarkan kosong untuk menggunakan default penyedia.
            </p>
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
