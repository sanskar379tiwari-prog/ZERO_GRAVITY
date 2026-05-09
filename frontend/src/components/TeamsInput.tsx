"use client";
import * as React from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamsInputProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  selectedCount?: number;
  totalUsers?: number;
  hint?: string;
  required?: boolean;
}

export const TeamsInput: React.FC<TeamsInputProps> = ({
  label = "Teams",
  selectedCount = 2,
  totalUsers = 16,
  hint = "This is a hint text to help user",
  required = true,
  className,
  ...props
}) => {
  return (
    <div className={cn("flex flex-col gap-1.5 w-full max-w-sm", className)} {...props}>
      {/* Label Area */}
      <div className="flex items-center gap-1">
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-purple-600 ml-0.5">*</span>}
        </label>
        <HelpCircle size={14} className="text-muted-foreground cursor-help" />
      </div>

      {/* Input Box */}
      <div 
        className={cn(
          "flex items-center justify-between px-3 py-2 bg-white border border-[#e5e7eb] rounded-[var(--radius)] cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
        )}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-sm font-bold text-black whitespace-nowrap">
            {selectedCount} selected
          </span>
          <span className="text-sm text-[#6b7280] whitespace-nowrap">
            {totalUsers} users
          </span>
        </div>
        <ChevronDown size={16} className="text-gray-400 shrink-0" />
      </div>

      {/* Hint Text */}
      {hint && (
        <p className="text-xs text-[#9ca3af]">
          {hint}
        </p>
      )}
    </div>
  );
};
