import React from 'react';
import { cn } from "@/lib/utils";

interface UiverseInputProps {
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onAction?: () => void;
  buttonText?: string;
  label?: string;
  hint?: string;
  required?: boolean;
  type?: string;
  className?: string;
}

export const UiverseInput: React.FC<UiverseInputProps> = ({
  placeholder,
  value,
  onChange,
  onAction,
  buttonText,
  label,
  hint,
  required,
  type = "text",
  className = ""
}) => {
  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      {label && (
        <div className="flex items-center gap-1">
          <label className="text-sm font-medium text-slate-700">
            {label}
            {required && <span className="text-purple-600 ml-0.5">*</span>}
          </label>
        </div>
      )}
      
      <div className="relative group flex items-center">
        <input
          type={type}
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all shadow-sm"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onAction) onAction();
          }}
        />
        {buttonText && (
          <button 
            onClick={onAction}
            className="absolute right-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
          >
            {buttonText}
          </button>
        )}
      </div>

      {hint && (
        <p className="text-xs text-slate-400 ml-1">
          {hint}
        </p>
      )}
    </div>
  );
};
