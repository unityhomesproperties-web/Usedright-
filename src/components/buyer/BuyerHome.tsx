import React from 'react';
import {
  BadgeCheck,
  Clock,
  FileCheck2,
  ArrowRight,
} from 'lucide-react';
import {
  AccessoryItem,
  Category,
  DeviceListing,
  PlatformConfig,
  VendorStorefront,
} from '../../types/marketplace';
import {
  CatalogToolbarFilters,
  filterListings,
} from '../../utils/marketplace';
import { selectPopularDevices } from '../../utils/homeUiPolicy';
import { CATEGORY_PHOTO_MAP } from '../../data/richNigerianCatalog';
import { SmartImage } from '../common/SmartImage';
import { TrustTileIcon } from '../common/TrustGraphics';
import { HeroCarousel } from './HeroCarousel';
import { ProductCard } from './ProductCard';

interface BuyerHomeProps {
  listings: DeviceListing[];
  vendors?: VendorStorefront[];
  platformConfig: PlatformConfig;
  customerState?: string;
  catalogFilters: CatalogToolbarFilters;
  onCatalogFiltersChange: (next: CatalogToolbarFilters) => void;
  onSelectCategory: (category: Category | 'all') => void;
  onSelectBrandCategory?: (category: Category, brandFilter: string) => void;
  onSelectDeals: () => void;
  onViewDetails: (listing: DeviceListing) => void;
  onAddToCart: (listing: DeviceListing, selectedAccessories?: AccessoryItem[]) => void;
  onOpenHowItWorks: () => void;
  onOpenBuyerProtection: () => void;
  onOpenInspectionEducationModal?: () => void;
  savedItemIds: string[];
  onToggleSave: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNavigateToExplore: (category?: Category) => void;
}

export const BuyerHome: React.FC<BuyerHomeProps> = ({
  listings,
  vendors,
  platformConfig,
  onSelectCategory,
  onSelectBrandCategory,
  onSelectDeals,
  onViewDetails,
  onAddToCart,
  onOpenHowItWorks,
  onOpenBuyerProtection,
  onOpenInspectionEducationModal,
  savedItemIds,
  onToggleSave,
  onNavigateToExplore,
}) => {
  const baseActiveListings = filterListings(listings, {}, platformConfig, vendors);

  const enabledCategories = platformConfig.categories.filter(
    (c) => c.enabled && (c.id as string) !== 'other_tech'
  );

  const popularDevices = selectPopularDevices(baseActiveListings, 8);

  const latestDeals = filterListings(
    listings,
    { dealsOnly: true, sortBy: 'deals_first' },
    platformConfig,
    vendors
  ).slice(0, 8);

  const preOwnedPhones = baseActiveListings
    .filter((l) => l.category === 'phones' && l.condition === 'Foreign-Used')
    .slice(0, 8);

  const preOwnedLaptops = baseActiveListings
    .filter((l) => l.category === 'laptops' && l.condition === 'Foreign-Used')
    .slice(0, 4);

  const moreTechShowcase = baseActiveListings
    .filter((l) =>
      [
        'tablets',
        'smartwatches',
        'audio',
        'gaming',
        'cameras',
        'computer_accessories',
        'accessories',
      ].includes(l.category)
    )
    .slice(0, 8);

  const brandNewListings = platformConfig.brandNewEnabled
    ? baseActiveListings.filter((l) => l.condition === 'Brand-New').slice(0, 4)
    : [];

  const categoryTileOrder: Array<{
    key: string;
    label: string;
    subtitle: string;
    image: string;
    category: Category;
    brandFilter?: string;
  }> = [
    {
      key: 'iphones',
      label: 'iPhones',
      subtitle: 'iPhone 16, 15 Pro, 14 & 13',
      image: '/assets/aistudio/IMG_2197_e7dddc99.jpeg',
      category: 'phones',
      brandFilter: 'Apple',
    },
    {
      key: 'android',
      label: 'Android',
      subtitle: 'Samsung Galaxy & Google Pixel',
      image: '/assets/aistudio/IMG_2198_1d596984.jpeg',
      category: 'phones',
      brandFilter: 'Android',
    },
    ...enabledCategories
      .filter((c) => c.id !== 'phones')
      .map((c) => ({
        key: c.id,
        label: c.id === 'computer_accessories' ? 'Laptop Accessories' : c.label,
        subtitle: c.brands.slice(0, 3).join(', '),
        image: CATEGORY_PHOTO_MAP[c.id] || '/assets/aistudio/IMG_2196_33cba3a2.jpeg',
        category: c.id,
      })),
  ];

  const inspectionHours = platformConfig.inspectionHours || 24;

  return (
    <div className="space-y-5 sm:space-y-7 pb-8 bg-[#FAF9FC] min-w-0">
      {/* 2. Hero Image Carousel */}
      <HeroCarousel
        onExploreDevices={() => onNavigateToExplore()}
        onHowItWorks={onOpenHowItWorks}
      />

      {/* 3. Compact 3-Item Trust Strip */}
      <section
        aria-label="Marketplace trust highlights"
        data-section="trust-strip"
        className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0"
      >
        <div className="bg-white rounded-2xl border border-[#EAE6F0] divide-y sm:divide-y-0 sm:divide-x divide-[#EAE6F0] grid grid-cols-1 sm:grid-cols-3">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] flex items-center justify-center shrink-0">
              <BadgeCheck className="w-4 h-4 text-[#A981FF]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#211B2B] truncate">
                Verified Vendors
              </div>
              <div className="text-[11px] text-[#716B7B] truncate">
                Identity-checked tech merchants
              </div>
            </div>
          </div>

          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] flex items-center justify-center shrink-0">
              <FileCheck2 className="w-4 h-4 text-[#A981FF]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#211B2B] truncate">
                Transparent Device Details
              </div>
              <div className="text-[11px] text-[#716B7B] truncate">
                Cosmetic grade &amp; fault history disclosed
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenBuyerProtection}
            className="px-4 py-3 flex items-center gap-3 text-left hover:bg-[#FAF9FC] transition-colors rounded-b-2xl sm:rounded-b-none sm:rounded-r-2xl"
          >
            <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-[#238653]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#211B2B] truncate">
                {inspectionHours}-Hour Inspection
              </div>
              <div className="text-[11px] text-[#716B7B] truncate">
                Protected payment hold until confirmed
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* 4. Shop by Category */}
      <section
        aria-labelledby="home-shop-by-category"
        data-section="shop-by-category"
        className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3.5 min-w-0"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 id="home-shop-by-category" className="text-base sm:text-lg font-semibold text-[#211B2B]">
              Shop by Category
            </h2>
            <p className="text-xs text-[#716B7B]">
              Verified Sellers. Transparent Devices. Smarter Purchases.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className="text-xs font-medium text-[#A981FF] hover:underline shrink-0"
          >
            View all ({baseActiveListings.length})
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {categoryTileOrder.map((tile) => (
            <button
              key={tile.key}
              type="button"
              onClick={() => {
                if (tile.brandFilter && onSelectBrandCategory) {
                  onSelectBrandCategory(tile.category, tile.brandFilter);
                } else {
                  onSelectCategory(tile.category);
                }
              }}
              className="group p-3 rounded-2xl bg-white border border-[#EAE6F0] shadow-sm hover:shadow-md hover:border-[#A981FF] text-left transition-all duration-200 flex flex-col gap-2.5"
            >
              <div className="aspect-[4/3] w-full rounded-xl bg-[#F7F6FA] flex items-center justify-center p-2 overflow-hidden">
                <SmartImage
                  src={tile.image}
                  alt={tile.label}
                  category={tile.category}
                  className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-200"
                />
              </div>
              <div className="px-0.5">
                <div className="text-xs sm:text-[13px] font-semibold text-[#211B2B] group-hover:text-[#A981FF] transition-colors truncate">
                  {tile.label}
                </div>
                <div className="text-[11px] text-[#716B7B] truncate">
                  {tile.subtitle}
                </div>
              </div>
            </button>
          ))}

          {/* Distinct Promotional "Latest Deals" Action Card */}
          <button
            type="button"
            onClick={onSelectDeals}
            className="group p-3 rounded-2xl bg-[#F5F0FF] border border-[#D0BCFC] shadow-sm hover:shadow-md hover:border-[#A981FF] text-left transition-all duration-200 flex flex-col gap-2.5"
          >
            <div className="aspect-[4/3] w-full rounded-xl bg-white relative flex items-center justify-center p-2 overflow-hidden">
              <SmartImage
                src="/assets/images/latest_deals_bundle_studio_1794735001365.jpg"
                alt="Latest Deals & Bundle Picks"
                category="phones"
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
              />
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#FEF3C7] border border-[#FDE68A] text-[9px] font-semibold text-[#92400E]">
                DEALS
              </span>
            </div>
            <div className="px-0.5">
              <div className="text-xs sm:text-[13px] font-semibold text-[#211B2B] group-hover:text-[#A981FF] transition-colors truncate">
                Latest Deals
              </div>
              <div className="text-[11px] text-[#4A4356] truncate">
                Weekly discounts &amp; bundles
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* 5. Popular Devices */}
      {popularDevices.length > 0 && (
        <section
          aria-labelledby="home-popular-devices"
          data-section="popular-devices"
          className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3.5 min-w-0"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 id="home-popular-devices" className="text-base sm:text-lg font-semibold text-[#211B2B]">
                Popular Devices
              </h2>
              <p className="text-xs text-[#716B7B]">
                High-demand pre-owned inventory with transparent grades and fault disclosures
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToExplore()}
              className="text-xs font-medium text-[#A981FF] hover:underline shrink-0"
            >
              Explore all →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
            {popularDevices.map((item) => (
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
        </section>
      )}

      {/* 6. Latest Deals & Bundle Picks */}
      {latestDeals.length > 0 && (
        <section
          aria-labelledby="home-latest-deals"
          data-section="latest-deals"
          className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3.5 min-w-0"
        >
          <div className="rounded-2xl bg-gradient-to-r from-[#F5F0FF] via-[#FAF8F4] to-white border border-[#D0BCFC]/70 p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-16 h-12 sm:w-20 sm:h-14 rounded-xl bg-white border border-[#EAE6F0] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                <SmartImage
                  src="/assets/images/latest_deals_bundle_studio_1794735001365.jpg"
                  alt="Latest Deals and Bundle Picks"
                  category="phones"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h2 id="home-latest-deals" className="text-base sm:text-lg font-semibold text-[#211B2B] truncate">
                  Latest Deals &amp; Bundle Picks
                </h2>
                <p className="text-xs text-[#4A4356] truncate">
                  Weekly price drops, starter packs, and free charger offers in Naira
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onSelectDeals}
              className="text-xs font-medium text-[#7E4EF2] hover:underline shrink-0 whitespace-nowrap"
            >
              See all deals →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
            {latestDeals.map((item) => (
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
        </section>
      )}

      {/* 7. Pre-Owned Phones */}
      {preOwnedPhones.length > 0 && (
        <section
          aria-labelledby="home-preowned-phones"
          data-section="preowned-phones"
          className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3.5 min-w-0"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 id="home-preowned-phones" className="text-base sm:text-lg font-semibold text-[#211B2B]">
                Pre-Owned Phones
              </h2>
              <p className="text-xs text-[#716B7B]">
                Cosmetic grade and functional status disclosed separately on every phone
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToExplore('phones')}
              className="text-xs font-medium text-[#A981FF] hover:underline shrink-0"
            >
              See all phones →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
            {preOwnedPhones.map((item) => (
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
        </section>
      )}

      {/* 8. Pre-Owned Laptops */}
      {preOwnedLaptops.length > 0 && (
        <section
          aria-labelledby="home-preowned-laptops"
          data-section="preowned-laptops"
          className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3.5 min-w-0"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 id="home-preowned-laptops" className="text-base sm:text-lg font-semibold text-[#211B2B]">
                Pre-Owned Laptops
              </h2>
              <p className="text-xs text-[#716B7B]">
                Confirmed model year, battery cycle details, ports &amp; keyboard checks
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToExplore('laptops')}
              className="text-xs font-medium text-[#A981FF] hover:underline shrink-0"
            >
              See all laptops →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
            {preOwnedLaptops.map((item) => (
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
        </section>
      )}

      {/* 9. Other Available Categories */}
      {(moreTechShowcase.length > 0 || (platformConfig.brandNewEnabled && brandNewListings.length > 0)) && (
        <section
          aria-labelledby="home-other-categories"
          data-section="other-categories"
          className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6 min-w-0"
        >
          {moreTechShowcase.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 id="home-other-categories" className="text-base sm:text-lg font-semibold text-[#211B2B]">
                    Other Available Categories
                  </h2>
                  <p className="text-xs text-[#716B7B]">
                    Tablets, smartwatches, audio, gaming, cameras &amp; laptop accessories
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateToExplore()}
                  className="text-xs font-medium text-[#A981FF] hover:underline shrink-0"
                >
                  Explore all →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
                {moreTechShowcase.map((item) => (
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
            </div>
          )}

          {platformConfig.brandNewEnabled && brandNewListings.length > 0 && (
            <div className="space-y-3.5 pt-4 border-t border-[#EAE6F0]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#7E4EF2]">
                    Separate Section
                  </span>
                  <h3 className="text-base sm:text-lg font-semibold text-[#211B2B] mt-0.5">
                    Brand-New Devices
                  </h3>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
                {brandNewListings.map((item) => (
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
            </div>
          )}
        </section>
      )}

      {/* 10. Why UsedRight */}
      <section
        aria-labelledby="home-why-usedright"
        data-section="why-usedright"
        className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0"
      >
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 id="home-why-usedright" className="text-base sm:text-lg font-semibold text-[#211B2B]">
                Why UsedRight
              </h2>
              <p className="text-xs sm:text-sm text-[#716B7B] mt-0.5">
                Know Exactly What You’re Buying — transparent disclosures before payment.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenBuyerProtection}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A981FF] hover:underline self-start sm:self-auto"
            >
              Read Buyer Protection Rules
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-start gap-3">
              <TrustTileIcon variant="provenance" size="sm" />
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-[#211B2B]">
                  Foreign-Used Provenance
                </h3>
                <p className="text-xs text-[#716B7B] mt-1 leading-relaxed">
                  Import origin status and reviewed batch manifests are shown clearly per listing.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-start gap-3">
              <TrustTileIcon variant="disclosure" size="sm" />
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-[#211B2B]">
                  Honest Fault Disclosures
                </h3>
                <p className="text-xs text-[#716B7B] mt-1 leading-relaxed">
                  Replaced parts, SIM restrictions, or untested features are flagged upfront in red.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-start gap-3">
              <TrustTileIcon variant="vendor" size="sm" />
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-[#211B2B]">
                  Verified Nigerian Vendors
                </h3>
                <p className="text-xs text-[#716B7B] mt-1 leading-relaxed">
                  Merchants undergo identity and business documentation verification before selling.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-start gap-3">
              <TrustTileIcon variant="escrow" size="sm" />
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-[#211B2B]">
                  {inspectionHours}-Hour Inspection Hold
                </h3>
                <p className="text-xs text-[#716B7B] mt-1 leading-relaxed">
                  Payout remains protected until verified delivery or pickup matches the listing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. How UsedRight Works */}
      <section
        aria-labelledby="home-how-it-works"
        data-section="how-usedright-works"
        className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0"
      >
        <div className="bg-gradient-to-br from-[#F5F0FF]/80 via-white to-[#FAF8F4] rounded-2xl border border-[#D0BCFC]/70 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 id="home-how-it-works" className="text-base sm:text-lg font-semibold text-[#211B2B]">
                How UsedRight Works
              </h2>
              <p className="text-xs sm:text-sm text-[#4A4356] mt-0.5">
                Protected ordering from device inspection to {inspectionHours}-hour post-delivery check.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onOpenInspectionEducationModal && (
                <button
                  type="button"
                  onClick={onOpenInspectionEducationModal}
                  className="px-3.5 py-2 rounded-xl bg-white border border-[#EAE6F0] hover:border-[#A981FF] text-xs font-medium text-[#211B2B] transition-colors min-h-[38px]"
                >
                  10-Point Inspection Guide
                </button>
              )}
              <button
                type="button"
                onClick={onOpenHowItWorks}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#A981FF] hover:bg-[#9366FA] text-white text-xs font-medium transition-colors min-h-[38px]"
              >
                Full Protection Guide
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-[#EAE6F0] space-y-2">
              <TrustTileIcon variant="disclosure" size="sm" />
              <h3 className="text-xs sm:text-sm font-semibold text-[#211B2B]">
                1. Review Condition Details
              </h3>
              <p className="text-xs text-[#716B7B] leading-relaxed">
                Check cosmetic grade, battery health, and any disclosed repairs or limitations.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#EAE6F0] space-y-2">
              <TrustTileIcon variant="lock" size="sm" />
              <h3 className="text-xs sm:text-sm font-semibold text-[#211B2B]">
                2. Pay Into Protected Hold
              </h3>
              <p className="text-xs text-[#716B7B] leading-relaxed">
                Your Naira payment is held conditionally instead of going directly to the seller.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#EAE6F0] space-y-2">
              <TrustTileIcon variant="delivery" size="sm" />
              <h3 className="text-xs sm:text-sm font-semibold text-[#211B2B]">
                3. Confirm With 6-Digit PIN
              </h3>
              <p className="text-xs text-[#716B7B] leading-relaxed">
                The {inspectionHours}-hour inspection window begins only after physical delivery confirmation.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#EAE6F0] space-y-2">
              <TrustTileIcon variant="inspection" size="sm" />
              <h3 className="text-xs sm:text-sm font-semibold text-[#211B2B]">
                4. Inspect or Open a Dispute
              </h3>
              <p className="text-xs text-[#716B7B] leading-relaxed">
                Verify screen, cameras, SIM, and ports—or report an issue directly in transaction chat.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BuyerHome;
