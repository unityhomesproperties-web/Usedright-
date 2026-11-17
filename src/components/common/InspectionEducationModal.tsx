import React, { useState } from 'react';
import { X, CheckSquare, Square, Smartphone, Laptop, ShieldCheck } from 'lucide-react';

interface InspectionEducationModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectionHours?: number;
}

const PHONE_CHECKS = [
  'Check screen touch response, brightness, and colours across the whole display',
  'Confirm IMEI or serial number matches the order summary',
  'Test SIM card network calls and Wi-Fi connection (unless listed as Wi-Fi only)',
  'Test Face ID or fingerprint sensor setup and unlock',
  'Take test photos and videos with front and rear cameras',
  'Play audio on loudspeaker, earpiece, and record a voice memo',
  'Plug in the charger and check charging percentage rises smoothly',
  'Check battery percentage stability over 20–30 minutes of use',
  'Confirm previous owner iCloud or Google account is completely signed out',
  'Compare exterior scratches or marks against the vendor Condition Grade',
];

const LAPTOP_CHECKS = [
  'Check the serial number matches your order record',
  'Test every key on the keyboard, backlight, and trackpad click/gestures',
  'Inspect the display for bright spots, dead pixels, or flicker',
  'Plug in the charger and test USB-C, USB-A, HDMI, and audio ports',
  'Check battery cycle count and unplug to test battery runtime',
  'Connect to Wi-Fi and pair a Bluetooth device',
  'Test webcam and microphone in a quick call or camera app',
  'Verify processor, RAM, and SSD size match the listing specifications',
  'Confirm there is no BIOS, EFI, or company management lock',
  'Open and close screen hinges smoothly and check overall frame condition',
];

export const InspectionEducationModal: React.FC<InspectionEducationModalProps> = ({
  isOpen,
  onClose,
  inspectionHours = 24,
}) => {
  const [deviceType, setDeviceType] = useState<'phone' | 'laptop'>('phone');
  const [checkedItems, setCheckedItems] = useState<number[]>([]);

  if (!isOpen) return null;

  const list = deviceType === 'phone' ? PHONE_CHECKS : LAPTOP_CHECKS;

  const toggleItem = (idx: number) => {
    setCheckedItems((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="10-Point Inspection Guide"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 border border-[#EAE6F0] shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between border-b border-[#EAE6F0] pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[#211B2B]">
              10-Point Post-Delivery Inspection Checklist
            </h2>
            <p className="text-xs text-[#716B7B]">
              Use this simple guide during your {inspectionHours}-hour check window after delivery.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspection guide"
            className="p-2 rounded-lg text-[#716B7B] hover:bg-[#FAF9FC]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAF9FC] rounded-xl border border-[#EAE6F0] text-xs">
          <button
            type="button"
            onClick={() => {
              setDeviceType('phone');
              setCheckedItems([]);
            }}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 font-medium ${
              deviceType === 'phone'
                ? 'bg-white text-[#A981FF] shadow-2xs'
                : 'text-[#716B7B]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Smartphone Checks
          </button>
          <button
            type="button"
            onClick={() => {
              setDeviceType('laptop');
              setCheckedItems([]);
            }}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 font-medium ${
              deviceType === 'laptop'
                ? 'bg-white text-[#A981FF] shadow-2xs'
                : 'text-[#716B7B]'
            }`}
          >
            <Laptop className="w-4 h-4" />
            Laptop Checks
          </button>
        </div>

        <div className="space-y-2">
          {list.map((text, idx) => {
            const checked = checkedItems.includes(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggleItem(idx)}
                className={`w-full p-3 rounded-xl border text-left flex items-start gap-2.5 text-xs transition-colors ${
                  checked
                    ? 'bg-[#F5F0FF] border-[#A981FF] text-[#211B2B]'
                    : 'bg-[#FAF9FC] border-[#EAE6F0] text-[#4A4356] hover:border-[#A981FF]'
                }`}
              >
                {checked ? (
                  <CheckSquare className="w-4 h-4 text-[#A981FF] shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-[#716B7B] shrink-0 mt-0.5" />
                )}
                <span>
                  <strong className="text-[#211B2B] mr-1">{idx + 1}.</strong>
                  {text}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[#4A4356]">
            <ShieldCheck className="w-4 h-4 text-[#A981FF]" />
            Completed {checkedItems.length} of {list.length} checks
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#A981FF] text-white font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default InspectionEducationModal;
