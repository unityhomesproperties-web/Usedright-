import React from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Tag,
  RotateCcw,
  MapPin,
} from 'lucide-react';
import {
  AccessoryItem,
  Category,
  DeviceListing,
  PlatformConfig,
  VendorStorefront,
} from '../../types/marketplace';
import {
  applyCatalogToolbarFilters,
  CatalogToolbarFilters,
  DEFAULT_CATALOG_TOOLBAR_FILTERS,
  filterListings,
  hasActiveCatalogFilters,
} from '../../utils/marketplace';
import {
  getFullStateLabel,
  getShortStateLabel,
  normalizeNigerianState,
} from '../../utils/nigerianStates';
import { CATEGORY_PHOTO_MAP } from '../../data/richNigerianCatalog';
import { SmartImage } from '../common/SmartImage';
import { TrustTileIcon } from '../common/TrustGraphics';
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
  customerState,
  catalogFilters,
  onCatalogFiltersChange,
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
  const isFiltered = hasActiveCatalogFilters(catalogFilters);
  const baseActiveListings = filterListings(listings, {}, platformConfig, vendors);
  const filteredListings = applyCatalogToolbarFilters(
    listings,
    catalogFilters,
    platformConfig,
    undefined,
    vendors
  );

  const enabledCategories = platformConfig.categories.filter(
    (c) => c.enabled && (c.id as string) !== 'other_tech'
  );

  const latestDeals = filterListings(
    listings,
    { dealsOnly: true, sortBy: 'deals_first' },
    platformConfig,
    vendors
  ).slice(0, 8);

  const foreignUsedPhones = baseActiveListings
    .filter((l) => l.category === 'phones' && l.condition === 'Foreign-Used')
    .slice(0, 8);

  const foreignUsedLaptops = baseActiveListings
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

  const valueDealsWithDisclosures = baseActiveListings
    .filter(
      (l) =>
        (l.disclosedFaultsList && l.disclosedFaultsList.length > 0) ||
        (l.disclosedFaults && l.disclosedFaults.length > 0) ||
        l.isWifiOnly
    )
    .slice(0, 4);

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
      label: 'Android (Samsung/Pixel)',
      subtitle: 'Galaxy S24 Ultra, Pixel & Fold',
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

  return (
    <div className="space-y-8 pb-28 bg-[#FAF9FC] min-w-0">
      {/* Filtered Live Results View when top toolbar filters/sort are active */}
      {isFiltered && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#211B2B]">
                {catalogFilters.locationState !== 'all'
                  ? `Verified Devices in ${getFullStateLabel(catalogFilters.locationState)}`
                  : 'Filtered Marketplace Catalog'}
              </h2>
              <p className="text-xs text-[#716B7B]">
                Showing {filteredListings.length} matching verified device
                {filteredListings.length === 1 ? '' : 's'}
                {catalogFilters.locationState !== 'all'
                  ? ` from vendors in ${getShortStateLabel(catalogFilters.locationState)}`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCatalogFiltersChange(DEFAULT_CATALOG_TOOLBAR_FILTERS)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[#EAE6F0] hover:border-[#A981FF] text-xs font-medium text-[#211B2B]"
            >
              <RotateCcw className="w-3 h-3 text-[#A981FF]" />
              Clear Filters
            </button>
          </div>

          {filteredListings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-8 text-center space-y-3">
              <p className="text-sm font-medium text-[#211B2B]">
                No pre-owned devices matched these exact filters.
              </p>
              <button
                type="button"
                onClick={() => onCatalogFiltersChange(DEFAULT_CATALOG_TOOLBAR_FILTERS)}
                className="px-4 py-2 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs font-medium"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
              {filteredListings.map((item) => (
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
        </section>
      )}

      {/* Hero Section */}
      {!isFiltered && (
        <section className="bg-white border-b border-[#EAE6F0] pt-6 pb-8">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 space-y-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F0FF] border border-[#D0BCFC] text-xs font-medium text-[#30102F]">
                    <ShieldCheck className="w-4 h-4 text-[#A981FF] shrink-0" />
                    Know Exactly What You’re Buying.
                  </div>
                  <span className="text-xs font-medium text-[#716B7B]">
                    Premium Tech. Smarter Prices. • {platformConfig.inspectionHours}-Hour Inspection Hold
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#211B2B] tracking-tight leading-snug">
                  Discover Quality Pre-Owned Tech.
                </h1>

                <p className="text-xs sm:text-sm text-[#4A4356] max-w-2xl leading-relaxed">
                  Shop pre-owned phones, laptops and gadgets with transparent condition details, clear product information and verified sellers.
                </p>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigateToExplore()}
                    className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-[#A981FF] hover:bg-[#B796FE] text-white text-xs sm:text-sm font-medium transition-colors min-h-[42px]"
                  >
                    Explore Devices
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onOpenHowItWorks}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF] text-xs sm:text-sm font-medium text-[#211B2B] min-h-[42px]"
                  >
                    How UsedRight Works
                  </button>
                  <button
                    type="button"
                    onClick={onSelectDeals}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] hover:border-[#A981FF] text-xs sm:text-sm font-medium text-[#30102F] min-h-[42px]"
                  >
                    <Tag className="w-4 h-4 text-[#A981FF]" />
                    Latest Deals
                  </button>
                  {customerState && customerState !== 'all' && (
                    <button
                      type="button"
                      onClick={() =>
                        onCatalogFiltersChange({
                          ...catalogFilters,
                          locationState: normalizeNigerianState(customerState),
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#D0BCFC] bg-white hover:border-[#A981FF] text-xs sm:text-sm font-medium text-[#211B2B] min-h-[42px]"
                    >
                      <MapPin className="w-4 h-4 text-[#A981FF]" />
                      Shop in {getShortStateLabel(customerState)}
                    </button>
                  )}
                </div>
              </div>

              {/* Vertical Trust Feature Cards with Multi-Tone SVG Illustrations */}
              <div className="lg:col-span-5">
                <div className="bg-white rounded-2xl border border-[#EAE6F0] shadow-sm divide-y divide-[#EAE6F0] overflow-hidden">
                  {/* 1. Foreign-Used Provenance */}
                  <div className="p-4 flex items-start gap-3.5 hover:bg-[#FAF9FC] transition-colors">
                    <TrustTileIcon variant="provenance" />
                    <div>
                      <h2 className="text-xs sm:text-sm font-semibold text-[#211B2B]">
                        Foreign-Used Provenance
                      </h2>
                      <p className="text-xs text-[#716B7B] mt-0.5 leading-relaxed">
                        Every batch links to verified US/UK import airway bills and supplier manifests.
                      </p>
                    </div>
                  </div>

                  {/* 2. Honest Red Issue Disclosures */}
                  <div className="p-4 flex items-start gap-3.5 hover:bg-[#FAF9FC] transition-colors">
                    <TrustTileIcon variant="disclosure" />
                    <div>
                      <h2 className="text-xs sm:text-sm font-semibold text-[#211B2B]">
                        Honest Red Issue Disclosures
                      </h2>
                      <p className="text-xs text-[#716B7B] mt-0.5 leading-relaxed">
                        Any replaced screen, SIM lock, or battery wear is highlighted in plain English before checkout.
                      </p>
                    </div>
                  </div>

                  {/* 3. Vetted Vendors */}
                  <div className="p-4 flex items-start gap-3.5 hover:bg-[#FAF9FC] transition-colors">
                    <TrustTileIcon variant="vendor" />
                    <div>
                      <h2 className="text-xs sm:text-sm font-semibold text-[#211B2B]">
                        Vetted Vendors
                      </h2>
                      <p className="text-xs text-[#716B7B] mt-0.5 leading-relaxed">
                        Identity-verified Nigerian merchants audited for CAC business registration and warranty fulfillment.
                      </p>
                    </div>
                  </div>

                  {/* 4. 24-Hour Inspection Hold */}
                  <div className="p-4 flex items-start gap-3.5 hover:bg-[#FAF9FC] transition-colors">
                    <TrustTileIcon variant="escrow" />
                    <div>
                      <h2 className="text-xs sm:text-sm font-semibold text-[#211B2B]">
                        {platformConfig.inspectionHours}-Hour Inspection Hold
                      </h2>
                      <p className="text-xs text-[#716B7B] mt-0.5 leading-relaxed">
                        Payout stays protected until you confirm physical delivery or pickup matches the listing.
                      </p>
                    </div>
                  </div>

                  <div className="px-4 py-3 bg-[#FAF9FC] flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={onOpenBuyerProtection}
                      className="font-medium text-[#A981FF] hover:underline"
                    >
                      Read Protection Rules
                    </button>
                    {onOpenInspectionEducationModal && (
                      <button
                        type="button"
                        onClick={onOpenInspectionEducationModal}
                        className="font-medium text-[#4A4356] hover:text-[#A981FF]"
                      >
                        10-Point Inspection Guide
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Shop by Category with Real Product Photography + Latest Deals Shortcut */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[#211B2B]">Shop by Category</h2>
            <p className="text-xs text-[#716B7B]">
              {platformConfig.brandNewEnabled
                ? 'Pre-owned and brand-new categories clearly separated'
                : 'Verified Sellers. Transparent Devices. Smarter Purchases.'}
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

          {/* Promotional "Latest Deals" Shortcut Card */}
          <button
            type="button"
            onClick={onSelectDeals}
            className="group p-3 rounded-2xl bg-[#F5F0FF] border border-[#D0BCFC] shadow-sm hover:shadow-md hover:border-[#A981FF] text-left transition-all duration-200 flex flex-col gap-2.5"
          >
            <div className="aspect-[4/3] w-full rounded-xl bg-white relative flex items-center justify-center p-2 overflow-hidden">
              <SmartImage
                src="/assets/images/latest_deals_bundle_studio_1794735001365.jpg"
                alt="Latest Deals"
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

      {/* Latest Deals & Featured Picks (High-Density Multi-Column Grid) */}
      {!isFiltered && latestDeals.length > 0 && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#211B2B]">
                Latest Deals & Bundle Picks
              </h2>
              <p className="text-xs text-[#716B7B]">
                Weekly price drops, starter packs, and free charger offers in Naira
              </p>
            </div>
            <button
              type="button"
              onClick={onSelectDeals}
              className="text-xs font-medium text-[#A981FF] hover:underline shrink-0"
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

      {/* Pre-Owned Phones */}
      {!isFiltered && foreignUsedPhones.length > 0 && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#211B2B]">
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
            {foreignUsedPhones.map((item) => (
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

      {/* Pre-Owned Laptops */}
      {!isFiltered && foreignUsedLaptops.length > 0 && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#211B2B]">
                Pre-Owned Laptops
              </h2>
              <p className="text-xs text-[#716B7B]">
                Confirmed model year, battery cycle details, ports & keyboard checks
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
            {foreignUsedLaptops.map((item) => (
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

      {/* Tablets, Audio, Gaming, Cameras & Laptop Accessories */}
      {!isFiltered && moreTechShowcase.length > 0 && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#211B2B]">
                Tablets, Audio, Gaming, Cameras & Laptop Gear
              </h2>
              <p className="text-xs text-[#716B7B]">
                Find the device you want, understand its condition and buy with confidence
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
        </section>
      )}

      {/* Value Deals with Transparent Red Disclosures */}
      {!isFiltered && valueDealsWithDisclosures.length > 0 && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3.5 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#211B2B]">
                Value Deals With Honest Disclosures
              </h2>
              <p className="text-xs text-[#716B7B]">
                Lower-priced devices where known limitations are clearly shown before checkout
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
            {valueDealsWithDisclosures.map((item) => (
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

      {/* Brand New Section (Only if Admin enables brandNewEnabled) */}
      {!isFiltered && platformConfig.brandNewEnabled && brandNewListings.length > 0 && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3.5 pt-4 border-t border-[#EAE6F0] min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <span className="px-2 py-0.5 rounded bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] font-medium text-[#211B2B]">
                Separate Section
              </span>
              <h2 className="text-base sm:text-lg font-semibold text-[#211B2B] mt-1">
                Brand-New Devices
              </h2>
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
        </section>
      )}
    </div>
  );
};

export default BuyerHome;
