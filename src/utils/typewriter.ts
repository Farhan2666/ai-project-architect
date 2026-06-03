"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface TypewriterOptions {
  url: string;
  headers?: Record<string, string>;
  body: unknown;
  onToken: (token: string) => void;
  onDone: (full: string) => void;
  onError: (err: Error) => void;
  speed?: number;
}

export async function startTypewriterStream(options: TypewriterOptions): Promise<AbortController> {
  const { url, headers, body, onToken, onDone, onError, speed = 20 } = options;
  const controller = new AbortController();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      onError(new Error(`HTTP ${response.status}: ${text}`));
      return controller;
    }

    const text = await response.text();
    let index = 0;
    let full = "";

    const timer = (callback: () => void) => {
      if (controller.signal.aborted) return;
      setTimeout(callback, speed);
    };

    const tick = () => {
      if (controller.signal.aborted) return;
      if (index >= text.length) {
        onDone(full);
        return;
      }

      const chunkSize = Math.min(3, text.length - index);
      const chunk = text.slice(index, index + chunkSize);
      index += chunkSize;
      full += chunk;
      onToken(chunk);

      timer(tick);
    };

    timer(tick);
  } catch (err) {
    if (!controller.signal.aborted) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  return controller;
}

export function useTypewriterStream() {
  const controllerRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const stream = useCallback(async (options: TypewriterOptions) => {
    setIsStreaming(true);
    controllerRef.current?.abort();

    const wrappedOnDone: TypewriterOptions["onDone"] = (full) => {
      setIsStreaming(false);
      options.onDone(full);
    };

    const wrappedOnError: TypewriterOptions["onError"] = (err) => {
      setIsStreaming(false);
      options.onError(err);
    };

    try {
      const controller = await startTypewriterStream({
        ...options,
        onDone: wrappedOnDone,
        onError: wrappedOnError,
      });
      controllerRef.current = controller;
    } catch (err) {
      setIsStreaming(false);
      if (err instanceof Error) options.onError(err);
    }
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return { stream, cancel, isStreaming };
}
