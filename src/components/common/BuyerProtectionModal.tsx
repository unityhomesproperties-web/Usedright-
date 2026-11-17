import React from 'react';
import { X, CheckCircle2, BookOpen } from 'lucide-react';
import { TrustTileIcon } from './TrustGraphics';
import { PLATFORM_FEE_REVENUE_DISCLOSURE } from '../../data/policiesCatalog';
import { BUYER_FEE_RATE } from '../../utils/marketplace';

interface BuyerProtectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectionHours?: number;
  customerFeeRate?: number;
  onOpenPolicyCentre?: (slug?: string) => void;
}

export const BuyerProtectionModal: React.FC<BuyerProtectionModalProps> = ({
  isOpen,
  onClose,
  inspectionHours = 24,
  customerFeeRate = BUYER_FEE_RATE,
  onOpenPolicyCentre,
}) => {
  if (!isOpen) return null;

  const pctDisplay = `${(customerFeeRate * 100).toFixed(1).replace(/\.0$/, '')}%`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Customer Platform Service Fee & Buyer Protection"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 border border-[#EAE6F0] shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between border-b border-[#EAE6F0] pb-3">
          <div className="flex items-center gap-3">
            <TrustTileIcon variant="escrow" size="sm" />
            <div>
              <h2 className="text-base font-semibold text-[#211B2B]">
                Customer Platform Service Fee &amp; Buyer Protection
              </h2>
              <p className="text-xs text-[#716B7B]">
                Up to 0.7% Customer Platform Service Fee (currently {pctDisplay}) · {inspectionHours}-hour inspection window
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close buyer protection modal"
            className="p-2 rounded-lg text-[#716B7B] hover:bg-[#FAF9FC]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-start gap-3">
            <TrustTileIcon variant="lock" size="sm" />
            <div className="space-y-1">
              <div className="font-semibold text-[#211B2B]">
                How the Customer Platform Service Fee Works
              </div>
              <p className="text-[#4A4356] leading-relaxed">
                Calculated on eligible product value only (currently {pctDisplay}, capped at 0.7%). Delivery fees are excluded from all UsedRight platform service fees. {PLATFORM_FEE_REVENUE_DISCLOSURE}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-start gap-3">
            <TrustTileIcon variant="escrow" size="sm" />
            <div className="space-y-1">
              <div className="font-semibold text-[#211B2B]">
                Confidential Delivery Verification Code &amp; {inspectionHours}-Hour Inspection
              </div>
              <p className="text-[#4A4356] leading-relaxed">
                When your vendor dispatches your order, UsedRight issues a confidential Delivery Verification Code. Share it only when you physically receive your package. Your minimum {inspectionHours}-hour inspection countdown starts upon code confirmation, and vendor settlement stays held while you test the device.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] flex items-start gap-3">
            <TrustTileIcon variant="disclosure" size="sm" />
            <div className="space-y-1">
              <div className="font-semibold">
                What If Something Is Wrong?
              </div>
              <p className="leading-relaxed">
                Report a delivery problem or tap <strong>REPORT A PROBLEM</strong> inside your order details. Confirming receipt never waives your right to open a dispute. Vendor payout freezes immediately while UsedRight Support investigates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {onOpenPolicyCentre ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPolicyCentre('customer-platform-service-fee-policy');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#D0BCFC] bg-[#F5F0FF] text-[#30102F] hover:border-[#A981FF] text-xs font-medium min-h-[44px]"
            >
              <BookOpen className="w-4 h-4 text-[#A981FF]" />
              Read Full Policy Centre
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-medium min-h-[44px]"
          >
            <CheckCircle2 className="w-4 h-4" />
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyerProtectionModal;
