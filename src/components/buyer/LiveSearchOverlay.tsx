import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Heart,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Store,
  X,
} from 'lucide-react';
import {
  DeviceListing,
  PlatformConfig,
  VendorStorefront,
} from '../../types/marketplace';
import {
  formatNaira,
  searchListingsWithQuickChip,
  searchVendorsAndStores,
} from '../../utils/marketplace';
import { getShortStateLabel, NIGERIAN_COMMERCIAL_HUBS } from '../../utils/nigerianStates';
import { Logo } from '../common/Logo';
import { SmartImage } from '../common/SmartImage';
import { ProductCard } from './ProductCard';

interface LiveSearchOverlayProps {
  isOpen: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  listings: DeviceListing[];
  vendors?: VendorStorefront[];
  platformConfig: PlatformConfig;
  onViewDetails: (listing: DeviceListing) => void;
  onSelectVendor?: (vendorId: string) => void;
  onAddToCart?: (listing: DeviceListing) => void;
  savedItemIds: string[];
  onToggleSave: (id: string) => void;
  followedVendorIds?: string[];
  onToggleFollowVendor?: (vendorId: string) => void;
}

const PRODUCT_QUICK_CHIPS = [
  { label: 'iPhone 16', query: 'iPhone 16' },
  { label: 'Deals', query: 'Deals' },
  { label: 'MacBook', query: 'MacBook' },
  { label: 'iPhone 13', query: 'iPhone 13' },
  { label: 'Samsung', query: 'Samsung' },
];

const STORE_QUICK_CHIPS = [
  { label: 'U-0045', query: 'U-0045' },
  { label: 'Prime Mobile', query: 'Prime Mobile' },
  { label: 'Apex Tech', query: 'Apex Tech' },
  { label: 'SwiftPhones', query: 'SwiftPhones' },
];

export const LiveSearchOverlay: React.FC<LiveSearchOverlayProps> = ({
  isOpen,
  query,
  onQueryChange,
  onClose,
  listings,
  vendors = [],
  platformConfig,
  onViewDetails,
  onSelectVendor,
  onAddToCart,
  savedItemIds,
  onToggleSave,
  followedVendorIds = [],
  onToggleFollowVendor,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchMode, setSearchMode] = useState<'products' | 'stores'>('products');
  const [verifiedStoresOnly, setVerifiedStoresOnly] = useState(false);
  const [storeStateFilter, setStoreStateFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const matchingResults = useMemo(() => {
    return searchListingsWithQuickChip(listings, query, platformConfig, vendors);
  }, [listings, query, platformConfig, vendors]);

  const matchingStores = useMemo(() => {
    return searchVendorsAndStores(vendors, listings, query, {
      verifiedOnly: searchMode === 'stores' ? verifiedStoresOnly : false,
      state: searchMode === 'stores' ? storeStateFilter : undefined,
      platformConfig,
    });
  }, [vendors, listings, query, searchMode, verifiedStoresOnly, storeStateFilter, platformConfig]);

  const quickChips = searchMode === 'stores' ? STORE_QUICK_CHIPS : PRODUCT_QUICK_CHIPS;
  const showsVendorIdShortcut =
    searchMode === 'products' &&
    query.trim().length >= 2 &&
    matchingStores.some((s) => s.matchType === 'id' || s.matchType === 'exact' || s.matchType === 'prefix');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live marketplace search"
      className="fixed inset-0 z-50 bg-[#FAF9FC] flex flex-col overflow-hidden"
    >
      {/* Top Overlay Header */}
      <div className="bg-white border-b border-[#EAE6F0] px-3 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Logo size="sm" showTagline={false} />
            <div className="flex items-center gap-2">
              {vendors.length > 0 && (
                <div
                  role="tablist"
                  aria-label="Search type"
                  className="inline-flex p-0.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={searchMode === 'products'}
                    onClick={() => setSearchMode('products')}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      searchMode === 'products'
                        ? 'bg-[#A981FF] text-white'
                        : 'text-[#4A4356] hover:text-[#211B2B]'
                    }`}
                  >
                    Products
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={searchMode === 'stores'}
                    onClick={() => setSearchMode('stores')}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      searchMode === 'stores'
                        ? 'bg-[#A981FF] text-white'
                        : 'text-[#4A4356] hover:text-[#211B2B]'
                    }`}
                  >
                    Stores ({vendors.filter((v) => !v.isSuspended).length})
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close search overlay"
                className="w-9 h-9 rounded-full border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF] flex items-center justify-center text-[#211B2B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#A981FF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              aria-label={
                searchMode === 'stores'
                  ? 'Search verified vendor stores or ID'
                  : 'Search UsedRight catalog'
              }
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={
                searchMode === 'stores'
                  ? 'Search store name or permanent Vendor ID (e.g. U-0045, Prime Mobile)...'
                  : 'Search iPhone 13, MacBook, Samsung, or Vendor ID U-0045...'
              }
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl border-2 border-[#A981FF] bg-white text-sm text-[#211B2B] placeholder-[#716B7B] focus:outline-none"
            />
            {query.trim() !== '' && (
              <button
                type="button"
                onClick={() => {
                  onQueryChange('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear search query"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#FAF9FC] hover:bg-[#F5F0FF] flex items-center justify-center text-[#716B7B]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick-Search Suggestion Chips & Store Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {quickChips.map((chip) => {
                const active = query.toLowerCase() === chip.query.toLowerCase();
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => onQueryChange(chip.query)}
                    className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#A981FF] text-white'
                        : 'bg-[#FAF9FC] border border-[#EAE6F0] text-[#211B2B] hover:border-[#A981FF]'
                    }`}
                  >
                    <span>{chip.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>

            {searchMode === 'stores' && (
              <div className="flex items-center gap-2 text-xs">
                <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-[#211B2B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verifiedStoresOnly}
                    onChange={(e) => setVerifiedStoresOnly(e.target.checked)}
                    className="accent-[#A981FF] rounded"
                  />
                  <span>Verified only</span>
                </label>
                <select
                  aria-label="Filter stores by Nigerian state"
                  value={storeStateFilter}
                  onChange={(e) => setStoreStateFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-[#211B2B] text-xs"
                >
                  <option value="all">All States</option>
                  {NIGERIAN_COMMERCIAL_HUBS.map((hub) => (
                    <option key={hub.value} value={hub.value}>
                      {getShortStateLabel(hub.value)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Body */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 pb-20">
        <div className="max-w-7xl mx-auto space-y-4">
          {searchMode === 'products' && showsVendorIdShortcut && (
            <div className="p-3 rounded-2xl bg-white border border-[#D0BCFC] flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-[#211B2B] flex items-center gap-2">
                <Store className="w-4 h-4 text-[#A981FF]" />
                <span>
                  Found{' '}
                  <strong>
                    {matchingStores.length} matching vendor store
                    {matchingStores.length === 1 ? '' : 's'}
                  </strong>{' '}
                  (including {matchingStores[0].vendor.name} ·{' '}
                  <span className="font-mono">{matchingStores[0].vendor.vendorNumber}</span>)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSearchMode('stores')}
                className="px-3 py-1.5 rounded-xl bg-[#F5F0FF] text-[#30102F] border border-[#D0BCFC] text-xs font-medium whitespace-nowrap"
              >
                View Store Results →
              </button>
            </div>
          )}

          {searchMode === 'stores' ? (
            <>
              <div className="flex items-center justify-between text-xs text-[#716B7B]">
                <span>
                  {query.trim()
                    ? `${matchingStores.length} store${matchingStores.length === 1 ? '' : 's'} matched "${query}"`
                    : `Showing ${matchingStores.length} vendor storefronts`}
                </span>
              </div>

              {matchingStores.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#EAE6F0] p-8 text-center space-y-3">
                  <p className="text-sm font-medium text-[#211B2B]">
                    No verified stores matched &quot;{query}&quot;.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onQueryChange('');
                      setVerifiedStoresOnly(false);
                      setStoreStateFilter('all');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-medium"
                  >
                    Show All Stores
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matchingStores.map((res) => {
                    const v = res.vendor;
                    const isFollowing = followedVendorIds.includes(v.id);
                    return (
                      <div
                        key={v.id}
                        className="bg-white rounded-2xl border border-[#EAE6F0] hover:border-[#A981FF] p-4 space-y-3 transition-colors flex flex-col justify-between"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <SmartImage
                                src={v.logo}
                                alt={v.name}
                                className="w-11 h-11 rounded-xl object-cover border border-[#EAE6F0] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h3 className="text-sm font-semibold text-[#211B2B] truncate">
                                    {v.name}
                                  </h3>
                                  <span className="font-mono text-[11px] font-semibold text-[#7E4EF2] bg-[#F5F0FF] px-1.5 py-0.5 rounded">
                                    {v.vendorNumber}
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#716B7B] flex items-center gap-2 flex-wrap mt-0.5">
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-[#A981FF]" />
                                    {getShortStateLabel(v.state || 'Lagos State')}
                                  </span>
                                  <span>·</span>
                                  <span className="inline-flex items-center gap-0.5 tabular-nums">
                                    <Star className="w-3 h-3 text-[#A981FF]" />
                                    {v.rating}
                                  </span>
                                  <span>·</span>
                                  <span>{res.activeListingsCount} listings</span>
                                </div>
                              </div>
                            </div>

                            {v.verificationBadge && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F5F0FF] border border-[#D0BCFC] text-[10px] font-medium text-[#30102F] shrink-0">
                                <ShieldCheck className="w-3 h-3 text-[#A981FF]" />
                                Verified
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[#4A4356] line-clamp-2">{v.description}</p>

                          {res.previewListings.length > 0 && (
                            <div className="pt-1 border-t border-[#EAE6F0] space-y-1">
                              <div className="text-[10px] font-medium text-[#716B7B]">
                                Featured Devices
                              </div>
                              <div className="space-y-1">
                                {res.previewListings.slice(0, 2).map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between text-[11px] text-[#211B2B]"
                                  >
                                    <span className="truncate pr-2">{item.title}</span>
                                    <span className="font-semibold tabular-nums shrink-0">
                                      {formatNaira(item.price)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectVendor?.(v.id);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-medium min-h-[40px]"
                          >
                            Visit Storefront
                          </button>
                          {onToggleFollowVendor && (
                            <button
                              type="button"
                              onClick={() => onToggleFollowVendor(v.id)}
                              aria-label={isFollowing ? `Unfollow ${v.name}` : `Follow ${v.name}`}
                              className={`px-3 py-2 rounded-xl border text-xs font-medium inline-flex items-center gap-1 min-h-[40px] whitespace-nowrap ${
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
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-[#716B7B]">
                <span>
                  {query.trim()
                    ? `${matchingResults.length} result${matchingResults.length === 1 ? '' : 's'} for "${query}"`
                    : `Popular foreign-used devices (${matchingResults.length})`}
                </span>
              </div>

              {matchingResults.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#EAE6F0] p-8 text-center space-y-3">
                  <p className="text-sm font-medium text-[#211B2B]">
                    No verified devices matched &quot;{query}&quot;.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => onQueryChange('')}
                      className="px-4 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-medium"
                    >
                      Show All Devices
                    </button>
                    {vendors.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSearchMode('stores')}
                        className="px-4 py-2 rounded-xl border border-[#EAE6F0] bg-white text-[#211B2B] text-xs font-medium"
                      >
                        Search Vendor Stores
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
                  {matchingResults.map((item) => (
                    <ProductCard
                      key={item.id}
                      listing={item}
                      onViewDetails={(selected) => {
                        onClose();
                        onViewDetails(selected);
                      }}
                      onAddToCart={onAddToCart}
                      isSaved={savedItemIds.includes(item.id)}
                      onToggleSave={onToggleSave}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveSearchOverlay;
