import React from 'react';

export type TrustGraphicVariant =
  | 'provenance'
  | 'disclosure'
  | 'vendor'
  | 'escrow'
  | 'inspection'
  | 'lock'
  | 'delivery';

export type VendorToolGraphicKey =
  | 'overview'
  | 'add_product'
  | 'bulk_accessories'
  | 'manage_products'
  | 'orders'
  | 'messages'
  | 'holds'
  | 'activity'
  | 'evidence'
  | 'promotions'
  | 'storefront'
  | 'reviews'
  | 'marketing'
  | 'settings'
  | 'public_store'
  | 'personal'
  | 'addresses'
  | 'saved'
  | 'help';

interface TrustTileIconProps {
  variant: TrustGraphicVariant;
  size?: 'sm' | 'md' | 'lg';
}

const TRUST_CONTAINER_TONES: Record<TrustGraphicVariant, string> = {
  provenance: 'bg-[#F5F0FF] border-[#D0BCFC]',
  disclosure: 'bg-[#FFF5F5] border-[#FED7D7]',
  vendor: 'bg-[#F5F0FF] border-[#D0BCFC]',
  escrow: 'bg-[#ECFDF5] border-[#A7F3D0]',
  inspection: 'bg-[#F5F0FF] border-[#D0BCFC]',
  lock: 'bg-[#F5F0FF] border-[#D0BCFC]',
  delivery: 'bg-[#F5F0FF] border-[#D0BCFC]',
};

export const TrustTileIcon: React.FC<TrustTileIconProps> = ({ variant, size = 'md' }) => {
  const boxClass =
    size === 'lg'
      ? 'w-12 h-12 rounded-2xl'
      : size === 'sm'
      ? 'w-9 h-9 rounded-xl'
      : 'w-11 h-11 rounded-xl';
  const svgClass = size === 'lg' ? 'w-7 h-7' : size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <div
      className={`${boxClass} ${TRUST_CONTAINER_TONES[variant]} border flex items-center justify-center shrink-0 shadow-[0_1px_2px_rgba(33,27,43,0.04)]`}
    >
      {variant === 'provenance' && (
        <svg viewBox="0 0 32 32" className={svgClass} fill="none" aria-hidden="true">
          <circle cx="15.5" cy="16.5" r="10.5" fill="#D0BCFC" stroke="#A981FF" strokeWidth="1.6" />
          <ellipse cx="15.5" cy="16.5" rx="4.8" ry="10.5" stroke="#7E4EF2" strokeWidth="1.3" />
          <path d="M5.5 16.5h20M7 12h17M7 21h17" stroke="#7E4EF2" strokeWidth="1.2" />
          <circle cx="24" cy="8.5" r="4.8" fill="#238653" stroke="#FFFFFF" strokeWidth="1.5" />
          <path
            d="M22.1 8.5l1.3 1.3 2.5-2.5"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {variant === 'disclosure' && (
        <svg viewBox="0 0 32 32" className={svgClass} fill="none" aria-hidden="true">
          <rect
            x="5.5"
            y="4.5"
            width="18.5"
            height="23"
            rx="3.5"
            fill="#FFFFFF"
            stroke="#D9534F"
            strokeWidth="1.6"
          />
          <rect x="9" y="8.5" width="9" height="2.4" rx="1.2" fill="#FED7D7" />
          <path d="M9.5 14h9.5M9.5 18h6.5" stroke="#211B2B" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="23.5" cy="21.5" r="5.5" fill="#D9534F" stroke="#FFFFFF" strokeWidth="1.5" />
          <path d="M23.5 19v2.8M23.5 24.1h.01" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}

      {variant === 'vendor' && (
        <svg viewBox="0 0 32 32" className={svgClass} fill="none" aria-hidden="true">
          <path
            d="M5.5 12l2.5-5.5h15.5L26 12v2a3 3 0 0 1-5 2.2A3 3 0 0 1 16 14a3 3 0 0 1-5 2.2A3 3 0 0 1 5.5 14v-2z"
            fill="#D0BCFC"
            stroke="#A981FF"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M7.5 16.5V25h16.5v-8.5" fill="#FFFFFF" stroke="#7E4EF2" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="12" y="19" width="5" height="6" rx="1" fill="#F5F0FF" stroke="#A981FF" strokeWidth="1.2" />
          <circle cx="23.5" cy="23" r="5" fill="#A981FF" stroke="#FFFFFF" strokeWidth="1.5" />
          <path
            d="M21.5 23l1.4 1.4 2.7-2.8"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {variant === 'escrow' && (
        <svg viewBox="0 0 32 32" className={svgClass} fill="none" aria-hidden="true">
          <path
            d="M16 4.5L25 8v7c0 6-3.8 10.7-9 12.5-5.2-1.8-9-6.5-9-12.5V8l9-3.5z"
            fill="#D1FAE5"
            stroke="#238653"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="15.5" r="4.8" fill="#FFFFFF" stroke="#238653" strokeWidth="1.4" />
          <path d="M16 13.3v2.3l1.7 1.1" stroke="#238653" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {variant === 'inspection' && (
        <svg viewBox="0 0 32 32" className={svgClass} fill="none" aria-hidden="true">
          <rect x="7" y="4.5" width="16" height="23" rx="3.5" fill="#FFFFFF" stroke="#A981FF" strokeWidth="1.6" />
          <rect x="10" y="8" width="10" height="13" rx="1.5" fill="#F5F0FF" stroke="#D0BCFC" strokeWidth="1.2" />
          <path
            d="M12.5 14.5l1.8 1.8 3.5-3.6"
            stroke="#7E4EF2"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="23" cy="23" r="5" fill="#A981FF" stroke="#FFFFFF" strokeWidth="1.4" />
          <path d="M21.2 23h3.6M23 21.2v3.6" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {variant === 'lock' && (
        <svg viewBox="0 0 32 32" className={svgClass} fill="none" aria-hidden="true">
          <path
            d="M11 14v-3.2a5 5 0 0 1 10 0V14"
            stroke="#7E4EF2"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <rect x="7" y="14" width="18" height="13" rx="3.5" fill="#D0BCFC" stroke="#A981FF" strokeWidth="1.6" />
          <circle cx="16" cy="19.5" r="2.2" fill="#FFFFFF" stroke="#7E4EF2" strokeWidth="1.2" />
          <path d="M16 21.5v2.2" stroke="#7E4EF2" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {variant === 'delivery' && (
        <svg viewBox="0 0 32 32" className={svgClass} fill="none" aria-hidden="true">
          <path
            d="M16 5L26 10v11.5L16 27 6 21.5V10L16 5z"
            fill="#D0BCFC"
            stroke="#A981FF"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M6 10l10 5.5L26 10M16 15.5V27" stroke="#7E4EF2" strokeWidth="1.4" strokeLinejoin="round" />
          <circle cx="24" cy="22.5" r="4.8" fill="#238653" stroke="#FFFFFF" strokeWidth="1.4" />
          <path
            d="M22.2 22.5l1.2 1.2 2.4-2.4"
            stroke="#FFFFFF"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
};

interface VendorToolGraphicProps {
  tool: VendorToolGraphicKey;
  danger?: boolean;
}

export const VendorToolGraphic: React.FC<VendorToolGraphicProps> = ({ tool, danger = false }) => {
  const wrapperStyle = danger
    ? 'bg-[#FFF5F5] border-[#FED7D7]'
    : 'bg-[#F5F0FF] border-[#D0BCFC]/75';

  return (
    <div
      className={`w-10 h-10 rounded-xl border ${wrapperStyle} flex items-center justify-center shrink-0 shadow-[0_1px_2px_rgba(33,27,43,0.04)]`}
    >
      {tool === 'overview' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <rect x="4" y="4" width="8.5" height="8.5" rx="2.2" fill="#D0BCFC" stroke="#A981FF" strokeWidth="1.5" />
          <rect x="15.5" y="4" width="8.5" height="8.5" rx="2.2" fill="#A981FF" stroke="#7E4EF2" strokeWidth="1.5" />
          <rect x="4" y="15.5" width="8.5" height="8.5" rx="2.2" fill="#FFFFFF" stroke="#A981FF" strokeWidth="1.5" />
          <rect x="15.5" y="15.5" width="8.5" height="8.5" rx="2.2" fill="#D0BCFC" stroke="#A981FF" strokeWidth="1.5" />
        </svg>
      )}

      {tool === 'add_product' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <rect x="5" y="4" width="15" height="20" rx="3" fill="#FFFFFF" stroke="#A981FF" strokeWidth="1.5" />
          <rect x="8" y="7.5" width="9" height="8" rx="1.5" fill="#D0BCFC" />
          <circle cx="20.5" cy="20" r="5" fill="#A981FF" stroke="#FFFFFF" strokeWidth="1.4" />
          <path d="M20.5 18v4M18.5 20h4" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}

      {tool === 'bulk_accessories' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <path d="M14 4.5L23.5 9.5 14 14.5 4.5 9.5 14 4.5z" fill="#D0BCFC" stroke="#A981FF" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M4.5 14L14 19l9.5-5" stroke="#7E4EF2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.5 18.5L14 23.5l9.5-5" stroke="#A981FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}

      {tool === 'manage_products' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <path d="M14 4.5L22.5 9v10L14 23.5 5.5 19V9L14 4.5z" fill="#D0BCFC" stroke="#A981FF" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M5.5 9L14 13.5 22.5 9M14 13.5v10" stroke="#7E4EF2" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )}

      {tool === 'orders' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <rect x="6" y="5" width="16" height="19" rx="2.8" fill="#FFFFFF" stroke="#A981FF" strokeWidth="1.5" />
          <rect x="10" y="3.5" width="8" height="3.5" rx="1.4" fill="#D0BCFC" stroke="#7E4EF2" strokeWidth="1.2" />
          <path d="M9.5 12h9M9.5 16h9M9.5 20h5.5" stroke="#7E4EF2" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {tool === 'messages' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <path
            d="M5 7.5A3 3 0 0 1 8 4.5h12a3 3 0 0 1 3 3v8.5a3 3 0 0 1-3 3h-8.5L6 23.5V7.5z"
            fill="#D0BCFC"
            stroke="#A981FF"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="10.5" cy="11.8" r="1.2" fill="#7E4EF2" />
          <circle cx="14" cy="11.8" r="1.2" fill="#7E4EF2" />
          <circle cx="17.5" cy="11.8" r="1.2" fill="#7E4EF2" />
        </svg>
      )}

      {tool === 'holds' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <rect x="4.5" y="7" width="19" height="14" rx="2.8" fill="#FFFFFF" stroke="#A981FF" strokeWidth="1.5" />
          <rect x="4.5" y="10.5" width="19" height="3.2" fill="#D0BCFC" />
          <circle cx="20.5" cy="19.5" r="4.5" fill="#238653" stroke="#FFFFFF" strokeWidth="1.3" />
          <path d="M18.9 19.5l1.1 1.1 2.2-2.2" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}

      {tool === 'activity' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <rect x="4.5" y="5.5" width="19" height="17" rx="3" fill="#FFFFFF" stroke="#A981FF" strokeWidth="1.5" />
          <path
            d="M7.5 15.5h3l2.2-5 2.8 8 2.2-3h2.8"
            stroke="#7E4EF2"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {tool === 'evidence' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <rect x="5.5" y="4.5" width="15" height="19" rx="2.8" fill="#FFFFFF" stroke="#A981FF" strokeWidth="1.5" />
          <path d="M9 10h8M9 14h6" stroke="#7E4EF2" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="20.5" cy="19.5" r="4.8" fill="#238653" stroke="#FFFFFF" strokeWidth="1.4" />
          <path d="M18.7 19.5l1.2 1.2 2.4-2.4" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}

      {tool === 'promotions' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <path
            d="M5 13.5V6.5A1.5 1.5 0 0 1 6.5 5h7l9.5 9.5a2 2 0 0 1 0 2.8l-5.7 5.7a2 2 0 0 1-2.8 0L5 13.5z"
            fill="#D0BCFC"
            stroke="#A981FF"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="9.8" cy="9.8" r="1.5" fill="#7E4EF2" />
        </svg>
      )}

      {tool === 'storefront' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <path
            d="M5 10.5l2-4.8h14l2 4.8v1.8a2.5 2.5 0 0 1-4.5 1.5 2.5 2.5 0 0 1-4.5 0 2.5 2.5 0 0 1-4.5 0A2.5 2.5 0 0 1 5 12.3v-1.8z"
            fill="#D0BCFC"
            stroke="#A981FF"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M6.8 14.5V22h14.4v-7.5" fill="#FFFFFF" stroke="#7E4EF2" strokeWidth="1.4" strokeLinejoin="round" />
          <rect x="11.5" y="17" width="5" height="5" rx="0.8" fill="#F5F0FF" stroke="#A981FF" strokeWidth="1.2" />
        </svg>
      )}

      {tool === 'reviews' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <path
            d="M14 4.5l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L14 18.8l-5.6 2.9 1.1-6.2-4.5-4.4 6.2-.9L14 4.5z"
            fill="#D0BCFC"
            stroke="#A981FF"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="14" cy="13.5" r="2.2" fill="#7E4EF2" />
        </svg>
      )}

      {tool === 'marketing' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <path
            d="M6 12.5v3a1.5 1.5 0 0 0 1.5 1.5H10l8.5 4V7L10 11H7.5A1.5 1.5 0 0 0 6 12.5z"
            fill="#D0BCFC"
            stroke="#A981FF"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M21 10.5c1.5 1.8 1.5 5.2 0 7" stroke="#7E4EF2" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}

      {tool === 'settings' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="7.5" fill="#D0BCFC" stroke="#A981FF" strokeWidth="1.5" />
          <circle cx="14" cy="14" r="3" fill="#FFFFFF" stroke="#7E4EF2" strokeWidth="1.5" />
          <path d="M14 4.5v2M14 21.5v2M4.5 14h2M21.5 14h2" stroke="#7E4EF2" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}

      {tool === 'public_store' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <rect x="4.5" y="6.5" width="17" height="15" rx="3" fill="#FFFFFF" stroke="#A981FF" strokeWidth="1.5" />
          <path d="M4.5 11h17" stroke="#D0BCFC" strokeWidth="2" />
          <path d="M13 17l7.5-7.5M15.5 9.5h5v5" stroke="#7E4EF2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}

      {tool === 'personal' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="9.5" fill="#D0BCFC" stroke="#A981FF" strokeWidth="1.5" />
          <circle cx="14" cy="11" r="3.2" fill="#FFFFFF" stroke="#7E4EF2" strokeWidth="1.4" />
          <path d="M8.8 20c1.1-2.4 2.9-3.6 5.2-3.6s4.1 1.2 5.2 3.6" stroke="#7E4EF2" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {tool === 'addresses' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <path
            d="M14 4.5a6.5 6.5 0 0 1 6.5 6.5c0 4.8-6.5 12-6.5 12S7.5 15.8 7.5 11A6.5 6.5 0 0 1 14 4.5z"
            fill="#D0BCFC"
            stroke="#A981FF"
            strokeWidth="1.5"
          />
          <circle cx="14" cy="11" r="2.4" fill="#FFFFFF" stroke="#7E4EF2" strokeWidth="1.4" />
        </svg>
      )}

      {tool === 'saved' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <path
            d="M14 22.5s-7.5-4.7-7.5-10.2A4.3 4.3 0 0 1 14 9.2a4.3 4.3 0 0 1 7.5 3.1c0 5.5-7.5 10.2-7.5 10.2z"
            fill="#D0BCFC"
            stroke="#A981FF"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {tool === 'help' && (
        <svg viewBox="0 0 28 28" className="w-5 h-5" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="9.5" fill="#D0BCFC" stroke="#A981FF" strokeWidth="1.5" />
          <path d="M11.6 11.2a2.5 2.5 0 1 1 3.7 2.2c-.8.4-1.3 1-1.3 1.9v.5" stroke="#7E4EF2" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="14" cy="19.2" r="1.1" fill="#7E4EF2" />
        </svg>
      )}
    </div>
  );
};

export default TrustTileIcon;
