import React from 'react';
import {
  X,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';
import { TrustGraphicVariant, TrustTileIcon } from './TrustGraphics';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectionHours?: number;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
  isOpen,
  onClose,
  inspectionHours = 24,
}) => {
  if (!isOpen) return null;

  const steps: {
    graphic: TrustGraphicVariant;
    title: string;
    desc: string;
  }[] = [
    {
      graphic: 'disclosure',
      title: '1. Read Simple, Honest Disclosures First',
      desc: 'Every product clearly states its Condition Grade, Model year vs Year made, battery health, and any known issue or repair in plain English in red before you pay.',
    },
    {
      graphic: 'lock',
      title: '2. Pay Through UsedRight Protected Hold',
      desc: 'Your payment is recorded under a conditional payment-hold arrangement rather than released directly to the vendor upfront.',
    },
    {
      graphic: 'delivery',
      title: '3. Delivery or Verified Pickup Confirmation',
      desc: `The ${inspectionHours}-hour inspection timer never begins when the vendor ships. It starts only after physical delivery or pickup is confirmed.`,
    },
    {
      graphic: 'escrow',
      title: `4. Complete Your ${inspectionHours}-Hour 10-Point Check`,
      desc: 'Test the screen, battery, camera, charging, SIM/Wi-Fi, speakers, and locks. Confirm receipt if everything matches, or tap REPORT A PROBLEM directly inside chat.',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How UsedRight Works"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 border border-[#EAE6F0] shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between border-b border-[#EAE6F0] pb-3">
          <div>
            <h2 className="text-lg font-semibold text-[#211B2B]">How UsedRight Works</h2>
            <p className="text-xs text-[#716B7B]">
              One connected transaction flow from enquiry to {inspectionHours}-hour inspection settlement.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close How It Works modal"
            className="p-2 rounded-lg text-[#716B7B] hover:bg-[#FAF9FC]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {steps.map((s) => (
            <div
              key={s.title}
              className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-2.5"
            >
              <TrustTileIcon variant={s.graphic} size="sm" />
              <h3 className="text-xs sm:text-sm font-semibold text-[#211B2B]">{s.title}</h3>
              <p className="text-xs text-[#4A4356] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-xs text-[#C53030] flex items-start gap-2.5">
          <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            If you open a dispute inside the transaction chat, automatic payout release pauses immediately and UsedRight Support joins your conversation.
          </span>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-medium min-h-[44px]"
          >
            <CheckCircle2 className="w-4 h-4" />
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksModal;
