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
      {/* Left panel */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "overflow-hidden",
          mobileTab === "doc" && "max-md:hidden",
          mobileTab === "chat" && "max-md:flex max-md:w-full max-md:fixed max-md:inset-0 max-md:z-40 max-md:pb-14"
        )}
        style={{
          width: hasData ? "35%" : "100%",
          minWidth: hasData ? 380 : undefined,
          maxWidth: hasData ? 500 : 800,
          margin: hasData ? "10px 0 10px 10px" : "0 auto",
        }}
      >
        <div className="glass-panel flex flex-col h-full overflow-hidden rounded-2xl shadow-2xl shadow-purple-950/20 transition-all duration-400">
          {left}
        </div>
      </motion.div>

      {/* Right panel */}
      <AnimatePresence>
        {hasData && (
          <motion.div
            key="doc-panel"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={cn(
              "flex flex-col overflow-hidden",
              mobileTab === "chat" && "max-md:hidden",
              mobileTab === "doc" && "max-md:flex max-md:w-full"
            )}
            style={{ flex: 1, minWidth: 0, margin: "10px 10px 10px 0" }}
          >
            <div className="glass-panel flex flex-col h-full rounded-2xl overflow-hidden">
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
            "flex flex-col items-center gap-0.5 text-[10px] font-medium transition-all duration-300 relative py-1 px-4",
            mobileTab === "chat" ? "text-white" : "text-white/50"
          )}
        >
          {mobileTab === "chat" && (
            <motion.div
              layoutId="mobile-tab-indicator"
              className="absolute inset-0 bg-white/5 rounded-xl"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <MessageSquare className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Chat</span>
        </button>
        <button
          onClick={() => setMobileTab("doc")}
          className={cn(
            "flex flex-col items-center gap-0.5 text-[10px] font-medium transition-all duration-300 relative py-1 px-4",
            mobileTab === "doc" ? "text-white" : "text-white/50"
          )}
        >
          {mobileTab === "doc" && (
            <motion.div
              layoutId="mobile-tab-indicator"
              className="absolute inset-0 bg-white/5 rounded-xl"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <FileText className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Document</span>
        </button>
      </div>
    </div>
  );
}
