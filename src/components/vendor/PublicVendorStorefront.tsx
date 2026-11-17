import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Heart,
  ShieldCheck,
  MapPin,
  Star,
  Tag,
  Megaphone,
  MessageSquare,
} from 'lucide-react';
import {
  AccessoryItem,
  Category,
  DeviceListing,
  PlatformConfig,
  VendorStorefront,
} from '../../types/marketplace';
import { filterListings } from '../../utils/marketplace';
import { ProductCard } from '../buyer/ProductCard';
import { SmartImage } from '../common/SmartImage';

interface PublicVendorStorefrontProps {
  vendor: VendorStorefront;
  listings: DeviceListing[];
  platformConfig?: PlatformConfig;
  onBack: () => void;
  onViewDetails: (item: DeviceListing) => void;
  onAddToCart: (item: DeviceListing, accessories?: AccessoryItem[]) => void;
  savedItemIds: string[];
  onToggleSave: (id: string) => void;
  onMessageVendor?: (listing: DeviceListing) => void;
  isFollowing?: boolean;
  onToggleFollow?: (vendorId: string) => void;
}

export const PublicVendorStorefront: React.FC<PublicVendorStorefrontProps> = ({
  vendor,
  listings,
  platformConfig,
  onBack,
  onViewDetails,
  onAddToCart,
  savedItemIds,
  onToggleSave,
  onMessageVendor,
  isFollowing = false,
  onToggleFollow,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');

  const vendorListings = useMemo(
    () => filterListings(listings, { vendorId: vendor.id }, platformConfig),
    [listings, vendor.id, platformConfig]
  );

  const availableCategories = useMemo(() => {
    const ids = Array.from(new Set(vendorListings.map((l) => l.category)));
    return ids.map((id) => {
      const cfg = platformConfig?.categories.find((c) => c.id === id);
      return { id, label: cfg?.label || id };
    });
  }, [vendorListings, platformConfig]);

  const displayedListings = useMemo(() => {
    if (selectedCategory === 'all') return vendorListings;
    return vendorListings.filter((l) => l.category === selectedCategory);
  }, [vendorListings, selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4A4356] hover:text-[#A981FF]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </button>

      {/* Storefront Banner & Header */}
      <div className="bg-white rounded-2xl border border-[#EAE6F0] overflow-hidden">
        <div className="h-36 sm:h-44 bg-[#F5F0FF] relative">
          <SmartImage
            src={vendor.banner}
            alt={`${vendor.name} storefront banner`}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl border-2 border-white shadow-sm overflow-hidden bg-white -mt-10 relative shrink-0">
              <SmartImage
                src={vendor.logo}
                alt={vendor.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-[#211B2B]">{vendor.name}</h1>
                {vendor.vendorNumber && (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#FAF9FC] border border-[#EAE6F0] text-[#7E4EF2]">
                    {vendor.vendorNumber}
                  </span>
                )}
                {vendor.verificationBadge && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#F5F0FF] border border-[#D0BCFC] text-xs font-medium text-[#211B2B]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#A981FF]" />
                    Verified Vendor
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#716B7B]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F5F0FF] border border-[#D0BCFC] text-[#211B2B] font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#A981FF]" />
                  {vendor.state || 'Lagos State'}
                </span>
                <span>{vendor.location}</span>
                <span className="flex items-center gap-1 tabular-nums">
                  <Star className="w-3.5 h-3.5 text-[#A981FF]" />
                  {vendor.rating} rating · {vendor.completedOrders} completed orders
                </span>
                {typeof vendor.followerCount === 'number' && (
                  <span className="tabular-nums">{vendor.followerCount} followers</span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#4A4356] max-w-2xl pt-1">
                {vendor.description}
              </p>

              {vendor.socialLinks && vendor.socialLinks.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1.5 text-xs">
                  {vendor.socialLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.normalizedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF9FC] border border-[#EAE6F0] hover:border-[#A981FF] text-[#211B2B]"
                    >
                      <span className="font-medium">{link.platform}:</span>
                      <span className="text-[#4A4356]">{link.handleOrUrl}</span>
                      {link.verified && <ShieldCheck className="w-3 h-3 text-[#A981FF]" />}
                      <ExternalLink className="w-3 h-3 text-[#716B7B]" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onToggleFollow && (
              <button
                type="button"
                onClick={() => onToggleFollow(vendor.id)}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-medium min-h-[44px] whitespace-nowrap ${
                  isFollowing
                    ? 'bg-[#F5F0FF] border-[#A981FF] text-[#30102F]'
                    : 'bg-white border-[#EAE6F0] text-[#211B2B] hover:border-[#A981FF]'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${
                    isFollowing ? 'fill-[#A981FF] text-[#A981FF]' : 'text-[#716B7B]'
                  }`}
                />
                {isFollowing ? 'Following Store' : 'Follow Store'}
              </button>
            )}
            {onMessageVendor && vendorListings[0] && (
              <button
                type="button"
                onClick={() => onMessageVendor(vendorListings[0])}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-medium min-h-[44px] shrink-0"
              >
                <MessageSquare className="w-4 h-4" />
                Message Vendor
              </button>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0]">
            <span className="font-semibold text-[#211B2B] block">Warranty Policy</span>
            <span className="text-[#4A4356]">{vendor.warrantyPolicy}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0]">
            <span className="font-semibold text-[#211B2B] block">Delivery & Pickup</span>
            <span className="text-[#4A4356]">{vendor.deliveryPolicy}</span>
          </div>
        </div>
      </div>

      {/* Announcements & Promotions */}
      {(vendor.announcements?.length > 0 || vendor.promotions?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendor.announcements?.slice(0, 1).map((a) => (
            <div
              key={a.id}
              className="p-4 rounded-2xl bg-white border border-[#EAE6F0] flex items-start gap-3 text-xs"
            >
              <Megaphone className="w-4 h-4 text-[#A981FF] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#211B2B]">{a.title}</div>
                <p className="text-[#4A4356] mt-0.5">{a.content}</p>
              </div>
            </div>
          ))}
          {vendor.promotions?.slice(0, 1).map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl bg-[#F5F0FF] border border-[#D0BCFC] flex items-start gap-3 text-xs"
            >
              <Tag className="w-4 h-4 text-[#A981FF] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#211B2B]">{p.name}</div>
                <p className="text-[#4A4356] mt-0.5">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium ${
            selectedCategory === 'all'
              ? 'bg-[#A981FF] text-white'
              : 'bg-white border border-[#EAE6F0] text-[#4A4356]'
          }`}
        >
          All Products ({vendorListings.length})
        </button>
        {availableCategories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium ${
              selectedCategory === c.id
                ? 'bg-[#A981FF] text-white'
                : 'bg-white border border-[#EAE6F0] text-[#4A4356]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Store Products Grid */}
      {displayedListings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-8 text-center text-xs text-[#716B7B]">
          No active listings in this category right now.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
          {displayedListings.map((item) => (
            <ProductCard
              key={item.id}
              listing={item}
              onViewDetails={onViewDetails}
              onAddToCart={onAddToCart}
              isSaved={savedItemIds.includes(item.id)}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicVendorStorefront;
