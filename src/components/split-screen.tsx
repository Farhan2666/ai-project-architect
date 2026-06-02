"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, FileText } from "lucide-react";

interface SplitScreenProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftWidth?: number;
}

export default function SplitScreen({ left, right, defaultLeftWidth = 50 }: SplitScreenProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "doc">("chat");

  const handleMouseDown = () => setIsDragging(true);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const newLeft = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftWidth(Math.min(Math.max(newLeft, 30), 70));
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Left panel */}
      <div
        className={cn(
          "overflow-auto flex flex-col max-md:pb-14",
          mobileTab === "doc" && "max-md:hidden"
        )}
        style={{ width: `${leftWidth}%` }}
      >
        {left}
      </div>

      {/* Divider — hidden on mobile */}
      <div
        className={cn(
          "relative w-1.5 cursor-col-resize shrink-0 bg-border hover:bg-primary/50 transition-colors",
          isDragging && "bg-primary",
          "max-md:hidden"
        )}
        onMouseDown={handleMouseDown}
      />

      {/* Right panel */}
      <div
        className={cn(
          "flex-1 overflow-auto flex flex-col max-md:pb-14",
          mobileTab === "chat" && "max-md:hidden"
        )}
      >
        {right}
      </div>

      {/* Mobile tab bar */}
      <div className="hidden max-md:flex fixed bottom-0 left-0 right-0 h-14 bg-background border-t border-border z-50 items-center justify-around px-4">
        <button
          onClick={() => setMobileTab("chat")}
          className={cn(
            "flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors",
            mobileTab === "chat" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <MessageSquare className="w-5 h-5" />
          Chat
        </button>
        <button
          onClick={() => setMobileTab("doc")}
          className={cn(
            "flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors",
            mobileTab === "doc" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <FileText className="w-5 h-5" />
          Document
        </button>
      </div>
    </div>
  );
}
