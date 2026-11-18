import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, MapPin, Search, SlidersHorizontal, Tag, X, RotateCcw } from 'lucide-react';
import {
  AccessoryItem,
  Category,
  CosmeticGrade,
  DeviceListing,
  PlatformConfig,
  VendorStorefront,
} from '../../types/marketplace';
import {
  applyCatalogToolbarFilters,
  CatalogToolbarFilters,
  DEFAULT_CATALOG_TOOLBAR_FILTERS,
  hasActiveCatalogFilters,
} from '../../utils/marketplace';
import {
  getShortStateLabel,
  NIGERIAN_COMMERCIAL_HUBS,
  normalizeNigerianState,
} from '../../utils/nigerianStates';
import { ProductCard } from './ProductCard';

interface ExploreViewProps {
  listings: DeviceListing[];
  vendors?: VendorStorefront[];
  platformConfig: PlatformConfig;
  customerState?: string;
  initialCategory?: Category | 'all';
  dealsOnly?: boolean;
  initialSearchQuery?: string;
  catalogFilters: CatalogToolbarFilters;
  onCatalogFiltersChange: (next: CatalogToolbarFilters) => void;
  onSelectDealsRoute?: () => void;
  onSelectCategoryRoute?: (category: Category | 'all') => void;
  onViewDetails: (item: DeviceListing) => void;
  onAddToCart: (item: DeviceListing, accessories?: AccessoryItem[]) => void;
  savedItemIds: string[];
  onToggleSave: (id: string) => void;
  onBack?: () => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  listings,
  vendors,
  platformConfig,
  customerState,
  initialCategory = 'all',
  dealsOnly = false,
  initialSearchQuery = '',
  catalogFilters,
  onCatalogFiltersChange,
  onSelectDealsRoute,
  onSelectCategoryRoute,
  onViewDetails,
  onAddToCart,
  savedItemIds,
  onToggleSave,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>(initialCategory);
  const [dealsFilterActive, setDealsFilterActive] = useState<boolean>(dealsOnly);
  const [minBatteryHealth, setMinBatteryHealth] = useState<number>(0);
  const [selectedRam, setSelectedRam] = useState<string>('all');
  const [hasDisclosedFaultsOnly, setHasDisclosedFaultsOnly] = useState<boolean>(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setDealsFilterActive(dealsOnly);
  }, [dealsOnly]);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  const enabledCategories = platformConfig.categories.filter(
    (c) => c.enabled && (c.id as string) !== 'other_tech'
  );

  const filtered = useMemo(() => {
    return applyCatalogToolbarFilters(
      listings,
      catalogFilters,
      platformConfig,
      {
        category: selectedCategory,
        dealsOnly: dealsFilterActive,
        searchQuery,
        minBatteryHealth: minBatteryHealth > 0 ? minBatteryHealth : undefined,
        ram: selectedRam !== 'all' ? [selectedRam] : undefined,
        hasDisclosedFaultsOnly,
      },
      vendors
    );
  }, [
    listings,
    vendors,
    catalogFilters,
    platformConfig,
    selectedCategory,
    dealsFilterActive,
    searchQuery,
    minBatteryHealth,
    selectedRam,
    hasDisclosedFaultsOnly,
  ]);

  const handleReset = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setDealsFilterActive(false);
    setMinBatteryHealth(0);
    setSelectedRam('all');
    setHasDisclosedFaultsOnly(false);
    onCatalogFiltersChange(DEFAULT_CATALOG_TOOLBAR_FILTERS);
  };

  const activeCategoryLabel = dealsFilterActive
    ? 'Latest Deals & Discounts'
    : selectedCategory === 'all'
    ? 'Explore All Pre-Owned Tech'
    : enabledCategories.find((c) => c.id === selectedCategory)?.label || 'Explore';

  const anyExtraDirty =
    hasActiveCatalogFilters(catalogFilters) ||
    searchQuery.trim() !== '' ||
    minBatteryHealth > 0 ||
    selectedRam !== 'all' ||
    hasDisclosedFaultsOnly;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-28 space-y-4 min-w-0">
      {/* Header & Search */}
      <div className="bg-white rounded-2xl border border-[#EAE6F0] p-3.5 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Go back"
                className="mt-0.5 w-8 h-8 rounded-full border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF] flex items-center justify-center text-[#211B2B] shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                {dealsFilterActive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FEF3C7] border border-[#FDE68A] text-[10px] font-semibold text-[#92400E]">
                    <Tag className="w-3 h-3" />
                    DEALS
                  </span>
                )}
                <h1 className="text-lg sm:text-xl font-semibold text-[#211B2B]">
                  {activeCategoryLabel}
                </h1>
              </div>
              <p className="text-xs text-[#716B7B] mt-0.5 flex flex-wrap items-center gap-1.5">
                <span>
                  Showing {filtered.length} verified product{filtered.length === 1 ? '' : 's'}
                </span>
                {catalogFilters.locationState !== 'all' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5F0FF] border border-[#D0BCFC] text-[11px] font-medium text-[#211B2B]">
                    <MapPin className="w-3 h-3 text-[#A981FF]" />
                    {getShortStateLabel(catalogFilters.locationState)} vendors
                  </span>
                ) : (
                  customerState &&
                  customerState !== 'all' && (
                    <button
                      type="button"
                      onClick={() =>
                        onCatalogFiltersChange({
                          ...catalogFilters,
                          locationState: normalizeNigerianState(customerState),
                        })
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FAF9FC] border border-[#EAE6F0] hover:border-[#A981FF] text-[11px] font-medium text-[#211B2B]"
                    >
                      <MapPin className="w-3 h-3 text-[#A981FF]" />
                      Show {getShortStateLabel(customerState)} only
                    </button>
                  )
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {anyExtraDirty && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF] text-xs font-medium text-[#211B2B] min-h-[38px]"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#A981FF]" />
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] text-xs font-medium text-[#211B2B] min-h-[38px]"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#A981FF]" />
              More Filters
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-[#716B7B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search products by brand, model, or seller"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search iPhone 13, iPhone 16e, MacBook Pro, Sony PS5, AirPods..."
            className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] focus:outline-none focus:border-[#A981FF] focus:bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear filter search"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#716B7B] hover:text-[#211B2B]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category + Latest Deals Horizontal Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => {
              setDealsFilterActive(false);
              setSelectedCategory('all');
              onSelectCategoryRoute?.('all');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all' && !dealsFilterActive
                ? 'bg-[#A981FF] text-white'
                : 'bg-[#FAF9FC] border border-[#EAE6F0] text-[#4A4356] hover:border-[#A981FF]'
            }`}
          >
            All Categories
          </button>

          <button
            type="button"
            onClick={() => {
              setDealsFilterActive(true);
              setSelectedCategory('all');
              onSelectDealsRoute?.();
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors inline-flex items-center gap-1 ${
              dealsFilterActive
                ? 'bg-[#A981FF] text-white'
                : 'bg-[#F5F0FF] border border-[#D0BCFC] text-[#211B2B] hover:border-[#A981FF]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Latest Deals
          </button>

          {enabledCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setDealsFilterActive(false);
                setSelectedCategory(cat.id);
                onSelectCategoryRoute?.(cat.id);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id && !dealsFilterActive
                  ? 'bg-[#A981FF] text-white'
                  : 'bg-[#FAF9FC] border border-[#EAE6F0] text-[#4A4356] hover:border-[#A981FF]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters + Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-w-0">
        <aside
          className={`lg:col-span-3 space-y-4 ${
            mobileFiltersOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="bg-white rounded-2xl border border-[#EAE6F0] p-4 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#211B2B]">Technical Filters</span>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-[#A981FF] hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            <div>
              <label className="block font-medium text-[#211B2B] mb-1">
                Vendor Location (State)
              </label>
              <select
                aria-label="Filter by vendor state in Nigeria"
                value={catalogFilters.locationState}
                onChange={(e) =>
                  onCatalogFiltersChange({ ...catalogFilters, locationState: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              >
                <option value="all">All Nigeria (Nationwide)</option>
                {NIGERIAN_COMMERCIAL_HUBS.map((hub) => (
                  <option key={hub.value} value={hub.value}>
                    {hub.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-[#211B2B] mb-1">
                Cosmetic Grade
              </label>
              <select
                aria-label="Sidebar filter by cosmetic grade"
                value={catalogFilters.grade}
                onChange={(e) =>
                  onCatalogFiltersChange({
                    ...catalogFilters,
                    grade: e.target.value as CosmeticGrade | 'all',
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              >
                <option value="all">All Cosmetic Grades</option>
                <option value="Grade A">Excellent (Grade A)</option>
                <option value="Grade B">Very Good (Grade B)</option>
                <option value="Grade C">Good (Grade C)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-[#211B2B] mb-1">
                Functionality Status
              </label>
              <select
                aria-label="Sidebar filter by functionality status"
                value={catalogFilters.functionalStatus || 'all'}
                onChange={(e) =>
                  onCatalogFiltersChange({
                    ...catalogFilters,
                    functionalStatus: e.target.value as CatalogToolbarFilters['functionalStatus'],
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
              >
                <option value="all">All Functionality Statuses</option>
                <option value="Fully Functional">Fully Functional</option>
                <option value="Functional With Disclosed Limitations">
                  Functional With Disclosed Limitations
                </option>
                <option value="Not Tested">Not Tested</option>
              </select>
            </div>

            {(selectedCategory === 'all' || selectedCategory === 'phones') && (
              <>
                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">
                    SIM / Network Status
                  </label>
                  <select
                    aria-label="Sidebar filter by SIM and network status"
                    value={catalogFilters.simFilter || 'all'}
                    onChange={(e) =>
                      onCatalogFiltersChange({
                        ...catalogFilters,
                        simFilter: e.target.value as CatalogToolbarFilters['simFilter'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  >
                    <option value="all">Any SIM / Network</option>
                    <option value="unlocked">SIM Unlocked</option>
                    <option value="locked">SIM Locked</option>
                    <option value="wifi_only">Wi-Fi Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">
                    Battery Replacement History
                  </label>
                  <select
                    aria-label="Sidebar filter by battery history"
                    value={catalogFilters.batteryFilter || 'all'}
                    onChange={(e) =>
                      onCatalogFiltersChange({
                        ...catalogFilters,
                        batteryFilter: e.target.value as CatalogToolbarFilters['batteryFilter'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  >
                    <option value="all">Any Battery Status</option>
                    <option value="original">Original Battery Only</option>
                    <option value="replaced">Battery Replaced</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">
                    Screen Replacement History
                  </label>
                  <select
                    aria-label="Sidebar filter by screen history"
                    value={catalogFilters.screenFilter || 'all'}
                    onChange={(e) =>
                      onCatalogFiltersChange({
                        ...catalogFilters,
                        screenFilter: e.target.value as CatalogToolbarFilters['screenFilter'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  >
                    <option value="all">Any Screen Status</option>
                    <option value="original">Original Screen Only</option>
                    <option value="replaced">Screen Replaced</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#211B2B] mb-1">
                    Minimum Battery Health: {minBatteryHealth > 0 ? `${minBatteryHealth}%` : 'Any'}
                  </label>
                  <select
                    value={minBatteryHealth}
                    onChange={(e) => setMinBatteryHealth(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                  >
                    <option value={0}>Any Battery Health</option>
                    <option value={80}>80% and above</option>
                    <option value={85}>85% and above</option>
                    <option value={90}>90% and above</option>
                  </select>
                </div>
              </>
            )}

            {(selectedCategory === 'all' || selectedCategory === 'laptops') && (
              <div>
                <label className="block font-medium text-[#211B2B] mb-1">Laptop RAM</label>
                <select
                  value={selectedRam}
                  onChange={(e) => setSelectedRam(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC]"
                >
                  <option value="all">Any RAM</option>
                  <option value="8GB">8GB</option>
                  <option value="16GB">16GB</option>
                  <option value="32GB">32GB</option>
                </select>
              </div>
            )}

            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(catalogFilters.originReviewedOnly)}
                onChange={(e) =>
                  onCatalogFiltersChange({
                    ...catalogFilters,
                    originReviewedOnly: e.target.checked,
                  })
                }
                className="rounded border-[#EAE6F0] accent-[#A981FF]"
              />
              <span className="text-[#211B2B]">Origin evidence reviewed only</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dealsFilterActive}
                onChange={(e) => setDealsFilterActive(e.target.checked)}
                className="rounded border-[#EAE6F0] accent-[#A981FF]"
              />
              <span className="text-[#211B2B]">Deals & Bundle discounts only</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasDisclosedFaultsOnly}
                onChange={(e) => setHasDisclosedFaultsOnly(e.target.checked)}
                className="rounded border-[#EAE6F0] accent-[#A981FF]"
              />
              <span className="text-[#211B2B]">Show value deals with disclosed issues</span>
            </label>

            {mobileFiltersOpen && (
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="lg:hidden w-full py-2.5 rounded-xl bg-[#A981FF] text-white font-medium flex items-center justify-center gap-1"
              >
                <X className="w-4 h-4" />
                View {filtered.length} Results
              </button>
            )}
          </div>
        </aside>

        <div className="lg:col-span-9 min-w-0">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-10 text-center space-y-3">
              <p className="text-sm font-medium text-[#211B2B]">
                No matching pre-owned products found.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-[#A981FF] text-white text-xs font-medium"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((item) => (
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
      </div>
    </div>
  );
};

export default ExploreView;
