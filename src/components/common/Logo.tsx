import React, { useState } from 'react';

interface LogoProps {
  size?: 'sm' | 'header' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'h-6 sm:h-7',
    header: 'h-8 sm:h-9',
    md: 'h-7 sm:h-8',
    lg: 'h-9 sm:h-11',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {!imageError ? (
        <img
          src="/assets/aistudio/UsedRight_0891efde.png"
          alt="UsedRight — Know Exactly What You're Buying"
          className={`${sizeClasses[size]} w-auto object-contain`}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#A981FF] flex items-center justify-center text-white font-semibold text-base">
            U
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-semibold tracking-tight text-[#211B2B]">
              Used<span className="text-[#A981FF]">Right</span>
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F5F0FF] text-[#4A4356] border border-[#D0BCFC]">
              VERIFIED
            </span>
          </div>
        </div>
      )}

      {showTagline && (
        <span className="hidden 2xl:inline-flex items-center text-[11px] font-normal text-[#716B7B] tracking-tight border-l border-[#EAE6F0] pl-2.5 py-0.5 whitespace-nowrap">
          Know Exactly What You’re Buying
        </span>
      )}
    </div>
  );
};

export default Logo;
