import React from 'react';

interface TerminalCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const TerminalCard: React.FC<TerminalCardProps> = ({ title, children, className = "" }) => {
  return (
    <div className={`terminal-card ${className}`}>
      <div className="terminal-controls">
        <span className="dot red" />
        <span className="dot yellow" />
        <span className="dot green" />
      </div>
      <h1>{title}</h1>
      <div className="terminal-content">
        {children}
      </div>
    </div>
  );
};
