import React from 'react';

interface TerminalCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const TerminalCard: React.FC<TerminalCardProps> = ({ title, children, className = "" }) => {
  return (
    <div className={`rounded-[5px] border-2 border-[#323232] bg-white overflow-hidden box-shadow-[4px_4px_#323232] ${className}`}
      style={{ boxShadow: '4px 4px #323232' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[#323232] bg-[lightgrey]">
        <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#323232]" />
        <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#323232]" />
        <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#323232]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-[#323232] ml-2">{title}</span>
      </div>
      <div className="p-4 text-sm text-[#323232]">
        {children}
      </div>
    </div>
  );
};
