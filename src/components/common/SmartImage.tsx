import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Laptop,
  Tablet,
  Watch,
  Headphones,
  Gamepad2,
  Camera,
  Monitor,
  Package,
} from 'lucide-react';
import { Category } from '../../types/marketplace';

interface SmartImageProps {
  src?: string;
  alt: string;
  category?: Category;
  className?: string;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  category = 'phones',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const renderIcon = () => {
    const iconCls = 'w-8 h-8 text-[#A981FF]';
    switch (category) {
      case 'laptops':
        return <Laptop className={iconCls} />;
      case 'tablets':
        return <Tablet className={iconCls} />;
      case 'smartwatches':
        return <Watch className={iconCls} />;
      case 'audio':
        return <Headphones className={iconCls} />;
      case 'gaming':
        return <Gamepad2 className={iconCls} />;
      case 'cameras':
        return <Camera className={iconCls} />;
      case 'computer_accessories':
        return <Monitor className={iconCls} />;
      case 'accessories':
        return <Package className={iconCls} />;
      default:
        return <Smartphone className={iconCls} />;
    }
  };

  if (!src || hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-[#F5F0FF] text-[#4A4356] border border-[#D0BCFC]/40 p-3 text-center ${className}`}
      >
        {renderIcon()}
        <span className="mt-1.5 text-[11px] font-medium text-[#716B7B] line-clamp-1">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
};

export default SmartImage;
