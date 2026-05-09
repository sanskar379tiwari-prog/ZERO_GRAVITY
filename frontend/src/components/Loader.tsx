import React from 'react';

interface LoaderProps {
  message?: string;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({ message = "Processing...", className = "" }) => {
  return (
    <div className={`loader-container animate-fade-in ${className}`}>
      <svg className="loader" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
        <g className="loader__glare">
          <path className="loader__glare-top" d="M11,10.5c0.5-0.5,1-1,1.5-1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path className="loader__glare-bottom" d="M11,37.5c0.5,0.5,1,1,1.5,1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </g>
        <g className="loader__model">
          <path className="loader__sand-drop" d="M26,12.5v27" stroke="var(--accent-primary)" strokeWidth="1" strokeDasharray="1 2" strokeLinecap="round" />
          <path className="loader__sand-fill" d="M15,31.5c0,0,5,2,11,2s11-2,11-2v8c0,0-5,2-11,2s-11-2-11-2v-8z" fill="var(--accent-primary)" opacity="0.4" />
          <circle className="loader__sand-grain-left" cx="21" cy="24" r="1" fill="var(--accent-secondary)" />
          <circle className="loader__sand-grain-right" cx="31" cy="24" r="1" fill="var(--accent-secondary)" />
          <path className="loader__sand-line-left" d="M20,15.5c-2,1-4,3-4,6" stroke="var(--accent-primary)" strokeWidth="0.5" fill="none" />
          <path className="loader__sand-line-right" d="M32,15.5c2,1,4,3,4,6" stroke="var(--accent-primary)" strokeWidth="0.5" fill="none" />
          <path className="loader__sand-mound-top" d="M18,12.5c0,0,4,2,8,2s8-2,8-2v-3c0,0-4,2-8,2s-8-2-8-2v3z" fill="var(--accent-primary)" />
          <path className="loader__sand-mound-bottom" d="M18,39.5c0,0,4,2,8,2s8-2,8-2v-3c0,0-4,2-8,2s-8-2-8-2v3z" fill="var(--accent-primary)" />
          <path className="loader__glass" d="M14,10.5c0,0,0,10,12,12s12-12,12-12v-3c0,0-0,10-12,12s-12-12-12-12v3z M14,41.5c0,0,0-10,12-12s12,10,12,10v3c0,0,0-10-12-12s-12,12-12,12v-3z" fill="none" stroke="white" strokeWidth="1" opacity="0.2" />
        </g>
        <g className="loader__motion">
          <path className="loader__motion-thick" d="M26,26m-23,0a23,23 0 1,0 46,0a23,23 0 1,0 -46,0" fill="none" strokeWidth="3" strokeLinecap="round" />
          <path className="loader__motion-medium" d="M26,26m-23,0a23,23 0 1,0 46,0a23,23 0 1,0 -46,0" fill="none" strokeWidth="2" strokeLinecap="round" />
          <path className="loader__motion-thin" d="M26,26m-23,0a23,23 0 1,0 46,0a23,23 0 1,0 -46,0" fill="none" strokeWidth="1" strokeLinecap="round" />
        </g>
      </svg>
      <p className="text-lg font-medium text-cyan-200 animate-pulse">{message}</p>
    </div>
  );
};
