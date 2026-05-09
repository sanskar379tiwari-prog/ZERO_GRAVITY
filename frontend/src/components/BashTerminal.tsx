import React from 'react';

interface BashTerminalProps {
  lines: { type: 'cmd' | 'out' | 'err' | 'success'; text: string }[];
  className?: string;
}

export const BashTerminal: React.FC<BashTerminalProps> = ({ lines, className = "" }) => {
  return (
    <aside className={`bg-black text-white p-5 rounded-lg w-full font-mono text-sm ${className}`}
      style={{ boxShadow: '6px 6px #323232', border: '2px solid #323232' }}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <p className="text-xs text-gray-500">zero-gravity</p>
      </div>
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {lines.length === 0 ? (
          <p className="text-gray-500">$ waiting for input...</p>
        ) : (
          lines.map((line, i) => (
            <p key={i} className={
              line.type === 'cmd' ? 'text-green-400' :
              line.type === 'err' ? 'text-red-400' :
              line.type === 'success' ? 'text-emerald-400 font-bold' :
              'text-gray-300'
            }>
              {line.type === 'cmd' ? `$ ${line.text}` : line.text}
            </p>
          ))
        )}
        <p className="text-green-400 animate-pulse">$</p>
      </div>
    </aside>
  );
};
