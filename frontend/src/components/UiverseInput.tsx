import React from 'react';

interface UiverseInputProps {
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onAction?: () => void;
  buttonText?: string;
  icon?: React.ReactNode;
  type?: string;
  className?: string;
}

export const UiverseInput: React.FC<UiverseInputProps> = ({
  placeholder,
  value,
  onChange,
  onAction,
  buttonText = "Submit",
  icon,
  type = "text",
  className = ""
}) => {
  return (
    <div className={`input-wrapper ${className}`}>
      <div className="icon-wrapper">
        {icon || (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <input
        type={type}
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onAction) onAction();
        }}
      />
      <button className="Subscribe-btn" onClick={onAction}>
        <span>{buttonText}</span>
        <div className="arrow">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </svg>
        </div>
      </button>
    </div>
  );
};
