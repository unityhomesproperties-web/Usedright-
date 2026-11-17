import React, { useEffect } from 'react';
import { Check, ChevronDown, Globe, MapPin, X } from 'lucide-react';
import {
  getShortStateLabel,
  NIGERIAN_COMMERCIAL_HUBS,
  normalizeNigerianState,
} from '../../utils/nigerianStates';

interface LocationFilterPillProps {
  value: string;
  onChange: (nextState: string) => void;
  customerState?: string;
  locationCounts?: Record<string, number>;
  totalActiveCount?: number;
}

export const LocationFilterPill: React.FC<LocationFilterPillProps> = ({
  value,
  onChange,
  customerState,
  locationCounts = {},
  totalActiveCount,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const normalizedValue = value && value !== 'all' ? normalizeNigerianState(value) : 'all';
  const isFiltered = normalizedValue !== 'all';
  const displayLabel = isFiltered ? getShortStateLabel(normalizedValue) : 'All Nigeria';

  const normalizedCustomerState =
    customerState && customerState !== 'all' ? normalizeNigerianState(customerState) : undefined;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const handleSelect = (nextState: string) => {
    onChange(nextState);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Filter by Nigerian state: ${displayLabel}`}
        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors min-h-[34px] whitespace-nowrap focus:outline-none ${
          isFiltered
            ? 'bg-[#F5F0FF] border-2 border-[#A981FF] text-[#211B2B]'
            : 'bg-[#FAF9FC] border border-[#EAE6F0] text-[#211B2B] hover:border-[#B796FE]'
        }`}
      >
        <MapPin className="w-3.5 h-3.5 text-[#A981FF] shrink-0" />
        <span>Location: {displayLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#716B7B] shrink-0" />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filter catalog by vendor state in Nigeria"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs sm:p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-[#EAE6F0] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-[#EAE6F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] flex items-center justify-center text-[#A981FF]">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#211B2B]">
                    Filter by Vendor Location
                  </h2>
                  <p className="text-[11px] text-[#716B7B]">
                    Discover verified electronics stocked near your state
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close location filter"
                className="w-8 h-8 rounded-full border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF] flex items-center justify-center text-[#716B7B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Customer State Shortcut */}
            {normalizedCustomerState && (
              <div className="px-4 pt-3 pb-1">
                <button
                  type="button"
                  onClick={() => handleSelect(normalizedCustomerState)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                    normalizedValue === normalizedCustomerState
                      ? 'bg-[#F5F0FF] border-[#A981FF]'
                      : 'bg-[#FAF9FC] border-[#D0BCFC] hover:border-[#A981FF]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#A981FF]" />
                    <div>
                      <div className="text-xs font-semibold text-[#211B2B]">
                        Near Me: {getShortStateLabel(normalizedCustomerState)}
                      </div>
                      <div className="text-[11px] text-[#716B7B]">
                        Your saved Nigerian state ({normalizedCustomerState})
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-[#EAE6F0] text-[11px] font-semibold text-[#211B2B] tabular-nums">
                    {locationCounts[normalizedCustomerState] || 0}
                  </span>
                </button>
              </div>
            )}

            {/* State List */}
            <div className="p-3 sm:p-4 overflow-y-auto space-y-1.5">
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                  normalizedValue === 'all'
                    ? 'bg-[#F5F0FF] border-[#A981FF]'
                    : 'bg-white border-[#EAE6F0] hover:border-[#B796FE]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Globe className="w-4 h-4 text-[#A981FF] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#211B2B]">All Nigeria</div>
                    <div className="text-[11px] text-[#716B7B]">
                      Show verified vendors nationwide
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {typeof totalActiveCount === 'number' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#FAF9FC] border border-[#EAE6F0] text-[11px] font-medium text-[#716B7B] tabular-nums">
                      {totalActiveCount}
                    </span>
                  )}
                  {normalizedValue === 'all' && (
                    <Check className="w-4 h-4 text-[#A981FF]" />
                  )}
                </div>
              </button>

              {NIGERIAN_COMMERCIAL_HUBS.map((hub) => {
                const isSelected = normalizedValue === hub.value;
                const count = locationCounts[hub.value] || 0;
                return (
                  <button
                    key={hub.value}
                    type="button"
                    onClick={() => handleSelect(hub.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#F5F0FF] border-[#A981FF]'
                        : 'bg-white border-[#EAE6F0] hover:border-[#B796FE]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-[#211B2B] truncate">
                        {hub.label}
                      </div>
                      <div className="text-[11px] text-[#716B7B] truncate">
                        {hub.hubArea}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums border ${
                          count > 0
                            ? 'bg-[#FAF9FC] border-[#EAE6F0] text-[#211B2B]'
                            : 'bg-[#FAF9FC] border-[#EAE6F0] text-[#716B7B]'
                        }`}
                      >
                        {count}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#A981FF]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LocationFilterPill;
