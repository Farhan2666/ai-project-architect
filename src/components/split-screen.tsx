"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface SplitScreenProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftWidth?: number;
}

export default function SplitScreen({ left, right, defaultLeftWidth = 50 }: SplitScreenProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);

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
      <div
        className="overflow-auto"
        style={{ width: `${leftWidth}%` }}
      >
        {left}
      </div>

      <div
        className={cn(
          "relative w-1.5 cursor-col-resize shrink-0 bg-border hover:bg-primary/50 transition-colors",
          isDragging && "bg-primary"
        )}
        onMouseDown={handleMouseDown}
      />

      <div className="flex-1 overflow-auto">
        {right}
      </div>
    </div>
  );
}
