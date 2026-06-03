"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MessageSquare, FileText } from "lucide-react";
import { useProjectStore } from "@/store/project";

interface SplitScreenProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export default function SplitScreen({ left, right }: SplitScreenProps) {
  const [mobileTab, setMobileTab] = useState<"chat" | "doc">("chat");
  const { document: doc, completedStages } = useProjectStore();
  const hasData = doc.length > 0 || completedStages.length > 0;

  return (
    <div className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/40 via-slate-950 to-black flex h-screen w-full overflow-hidden">
      {/* Left panel — morphs between centered focus and floating sidebar */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "flex flex-col overflow-hidden",
          mobileTab === "doc" && "max-md:hidden",
          mobileTab === "chat" && "max-md:flex max-md:w-full max-md:absolute max-md:inset-0 max-md:z-40"
        )}
        style={{
          width: hasData ? "30%" : "100%",
          minWidth: hasData ? 320 : undefined,
          maxWidth: hasData ? 480 : 720,
          margin: hasData ? "12px 0 12px 12px" : "0 auto",
        }}
      >
        <div
          className={cn(
            "flex flex-col h-full overflow-hidden",
            hasData
              ? "bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-950/20"
              : "bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-950/20 max-w-2xl mx-auto my-auto max-h-[90vh]"
          )}
        >
          {left}
        </div>
      </motion.div>

      {/* Right panel — hidden when no data, expands when hasData */}
      <AnimatePresence>
        {hasData && (
          <motion.div
            key="doc-panel"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={cn(
              "flex-1 flex flex-col overflow-hidden",
              mobileTab === "chat" && "max-md:hidden",
              mobileTab === "doc" && "max-md:flex max-md:w-full"
            )}
          >
            <div className="flex flex-col h-full m-3 rounded-2xl bg-slate-950/40 backdrop-blur-xl border border-white/10 overflow-hidden">
              {right}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile tab bar */}
      <div className="hidden max-md:flex fixed bottom-0 left-0 right-0 h-14 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50 items-center justify-around px-4">
        <button
          onClick={() => setMobileTab("chat")}
          className={cn(
            "flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors",
            mobileTab === "chat" ? "text-white" : "text-white/50"
          )}
        >
          <MessageSquare className="w-5 h-5" />
          Chat
        </button>
        <button
          onClick={() => setMobileTab("doc")}
          className={cn(
            "flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors",
            mobileTab === "doc" ? "text-white" : "text-white/50"
          )}
        >
          <FileText className="w-5 h-5" />
          Document
        </button>
      </div>
    </div>
  );
}
