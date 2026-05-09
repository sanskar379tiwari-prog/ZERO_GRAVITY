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
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      {label && (
        <label className="text-xs font-black uppercase tracking-widest text-[#323232]">
          {label}
          {required && <span className="text-[#2d8cf0] ml-1">*</span>}
        </label>
      )}
      
      <div className="relative group flex items-center">
        <input
          type={type}
          className="w-full px-4 py-3 bg-white border-2 border-[#323232] rounded-[5px] text-sm font-black text-[#323232] placeholder:text-[#999] focus:outline-none focus:shadow-[4px_4px_#2d8cf0] focus:border-[#2d8cf0] transition-all shadow-[4px_4px_#323232]"
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
            className="absolute right-2 px-4 py-1.5 bg-[#323232] text-white text-[10px] font-black uppercase tracking-widest rounded-[3px] hover:translate-x-[1px] hover:translate-y-[1px] transition-transform"
          >
            {buttonText}
          </button>
        )}
      </div>

      {hint && (
        <p className="text-[10px] text-[#999] font-black uppercase tracking-widest ml-1">
          {hint}
        </p>
      )}
    </div>
  );
};
