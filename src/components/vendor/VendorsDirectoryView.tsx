import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Store,
} from 'lucide-react';
import { VendorStorefront } from '../../types/marketplace';
import { searchVendorsAndStores } from '../../utils/marketplace';
import {
  getShortStateLabel,
  inferStateFromLocationText,
  normalizeNigerianState,
} from '../../utils/nigerianStates';
import { SmartImage } from '../common/SmartImage';

interface VendorsDirectoryViewProps {
  vendors: VendorStorefront[];
  onSelectVendor: (vendorId: string) => void;
  onBackToMarketplace: () => void;
  followedVendorIds?: string[];
  onToggleFollowVendor?: (vendorId: string) => void;
}

export const VendorsDirectoryView: React.FC<VendorsDirectoryViewProps> = ({
  vendors,
  onSelectVendor,
  onBackToMarketplace,
  followedVendorIds = [],
  onToggleFollowVendor,
}) => {
  const [selectedState, setSelectedState] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const availableStates = useMemo(() => {
    const states = new Set<string>();
    vendors.forEach((v) => {
      states.add(
        v.state ? normalizeNigerianState(v.state) : inferStateFromLocationText(v.location)
      );
    });
    return Array.from(states);
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    const results = searchVendorsAndStores(vendors, [], searchQuery, {
      verifiedOnly,
      state: selectedState === 'all' ? undefined : selectedState,
    });
    return results.map((r) => r.vendor);
  }, [vendors, searchQuery, verifiedOnly, selectedState]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBackToMarketplace}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#716B7B] hover:text-[#A981FF] mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Marketplace
          </button>
          <h1 className="text-xl font-semibold text-[#211B2B]">Verified Vendors</h1>
          <p className="text-xs text-[#716B7B]">
            Registered technology vendors across Nigeria vetted for foreign-used import records, social verification, and honest disclosures.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[230px]">
            <Search className="w-4 h-4 text-[#716B7B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search store name or permanent Vendor ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search store or Vendor ID (U-0045)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#EAE6F0] bg-white focus:outline-none focus:border-[#A981FF]"
            />
          </div>
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white text-xs text-[#211B2B] cursor-pointer">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="accent-[#A981FF] rounded"
            />
            <span>Verified only</span>
          </label>
        </div>
      </div>

      {/* State Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setSelectedState('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            selectedState === 'all'
              ? 'bg-[#A981FF] text-white'
              : 'bg-white border border-[#EAE6F0] text-[#211B2B] hover:border-[#A981FF]'
          }`}
        >
          All Nigeria ({vendors.filter((v) => !v.isSuspended).length})
        </button>
        {availableStates.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setSelectedState(st)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors inline-flex items-center gap-1 ${
              selectedState === st
                ? 'bg-[#A981FF] text-white'
                : 'bg-white border border-[#EAE6F0] text-[#211B2B] hover:border-[#A981FF]'
            }`}
          >
            <MapPin className="w-3 h-3" />
            {getShortStateLabel(st)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVendors.map((v) => {
          const vendorState = v.state
            ? normalizeNigerianState(v.state)
            : inferStateFromLocationText(v.location);
          const isFollowing = followedVendorIds.includes(v.id);
          return (
            <div
              key={v.id}
              className="bg-white rounded-2xl border border-[#EAE6F0] hover:border-[#A981FF] transition-colors overflow-hidden flex flex-col"
            >
              <div className="h-28 bg-[#F5F0FF] relative">
                <SmartImage
                  src={v.banner}
                  alt={`${v.name} banner`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute -bottom-6 left-4 w-14 h-14 rounded-xl bg-white border border-[#EAE6F0] overflow-hidden shadow-xs">
                  <SmartImage
                    src={v.logo}
                    alt={v.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {v.vendorNumber && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-white/95 border border-[#EAE6F0] font-mono text-[11px] font-semibold text-[#211B2B]">
                    {v.vendorNumber}
                  </span>
                )}
              </div>

              <div className="p-4 pt-8 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-[#211B2B] flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-[#A981FF] shrink-0" />
                      <span className="truncate">{v.name}</span>
                    </h2>
                    {v.verificationBadge && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] font-medium text-[#4A4356] shrink-0">
                        <ShieldCheck className="w-3 h-3 text-[#A981FF]" />
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#716B7B] flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F5F0FF] text-[#211B2B] font-medium text-[11px]">
                      <MapPin className="w-3 h-3 text-[#A981FF]" />
                      {getShortStateLabel(vendorState)}
                    </span>
                    <span className="truncate">{v.location}</span>
                    <span className="flex items-center gap-1 tabular-nums">
                      <Star className="w-3.5 h-3.5 text-[#A981FF]" />
                      {v.rating} ({v.completedOrders} orders)
                    </span>
                  </div>
                  <p className="text-xs text-[#4A4356] line-clamp-2 pt-1">{v.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectVendor(v.id)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 min-h-[42px]"
                  >
                    Visit Storefront
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  {onToggleFollowVendor && (
                    <button
                      type="button"
                      onClick={() => onToggleFollowVendor(v.id)}
                      aria-label={isFollowing ? `Unfollow ${v.name}` : `Follow ${v.name}`}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-medium inline-flex items-center gap-1 min-h-[42px] whitespace-nowrap ${
                        isFollowing
                          ? 'bg-[#F5F0FF] border-[#A981FF] text-[#30102F]'
                          : 'bg-white border-[#EAE6F0] text-[#4A4356] hover:border-[#A981FF]'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isFollowing ? 'fill-[#A981FF] text-[#A981FF]' : 'text-[#716B7B]'
                        }`}
                      />
                      <span className="tabular-nums">{v.followerCount ?? 0}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VendorsDirectoryView;
