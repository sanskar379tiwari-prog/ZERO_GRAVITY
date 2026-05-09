import React from 'react';

interface LoaderProps {
  message?: string;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({ message = "Processing...", className = "" }) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-6 py-10 ${className}`}>
      <ul className="wave-menu">
        <li />
        <li />
        <li />
        <li />
        <li />
        <li />
        <li />
        <li />
        <li />
        <li />
      </ul>
      <p className="text-base font-black text-[#323232] text-center">{message}</p>
    </div>
  );
};
