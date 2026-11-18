import React from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { CosmeticGrade } from '../../types/marketplace';
import {
  CatalogPriceBucket,
  CatalogSortOption,
  CatalogToolbarFilters,
  DEFAULT_CATALOG_TOOLBAR_FILTERS,
  hasActiveCatalogFilters,
} from '../../utils/marketplace';
import { LocationFilterPill } from './LocationFilterPill';

interface CatalogFilterBarProps {
  filters: CatalogToolbarFilters;
  onChange: (next: CatalogToolbarFilters) => void;
  totalCount?: number;
  customerState?: string;
  locationCounts?: Record<string, number>;
  totalActiveCount?: number;
}

export const CatalogFilterBar: React.FC<CatalogFilterBarProps> = ({
  filters,
  onChange,
  totalCount,
  customerState,
  locationCounts,
  totalActiveCount,
}) => {
  const isDirty = hasActiveCatalogFilters(filters);

  const selectClass = (active: boolean) =>
    `appearance-none pl-2.5 pr-6 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors min-h-[34px] focus:outline-none ${
      active
        ? 'bg-[#F5F0FF] border-2 border-[#A981FF] text-[#211B2B]'
        : 'bg-[#FAF9FC] border border-[#EAE6F0] text-[#211B2B] hover:border-[#B796FE]'
    }`;

  return (
    <div
      aria-label="Sorting and filtering toolbar"
      className="bg-white border-b border-[#EAE6F0]"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center gap-2 py-2">
        <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar flex items-center gap-1.5">
          {/* Nigerian State Location Filter Pill */}
          <LocationFilterPill
            value={filters.locationState}
            onChange={(nextState) => onChange({ ...filters, locationState: nextState })}
            customerState={customerState}
            locationCounts={locationCounts}
            totalActiveCount={totalActiveCount}
          />

          {/* Sort Dropdown Pill */}
          <div className="relative shrink-0">
            <select
              aria-label="Sort products"
              value={filters.sortBy}
              onChange={(e) =>
                onChange({ ...filters, sortBy: e.target.value as CatalogSortOption })
              }
              className={selectClass(filters.sortBy !== 'recommended')}
            >
              <option value="recommended">Sort: Recommended</option>
              <option value="price_asc">Lowest Price (₦)</option>
              <option value="price_desc">Highest Price (₦)</option>
              <option value="top_rated">Top Rated</option>
              <option value="deals_first">Deals First</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#716B7B] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
          </div>

          {/* Price Dropdown Pill */}
          <div className="relative shrink-0">
            <select
              aria-label="Filter by price"
              value={filters.priceBucket}
              onChange={(e) =>
                onChange({ ...filters, priceBucket: e.target.value as CatalogPriceBucket })
              }
              className={selectClass(filters.priceBucket !== 'all')}
            >
              <option value="all">Price</option>
              <option value="under_300k">Under ₦300k</option>
              <option value="300k_600k">₦300k – ₦600k</option>
              <option value="600k_1m">₦600k – ₦1M</option>
              <option value="above_1m">Above ₦1M</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#716B7B] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
          </div>

          {/* Brand Dropdown Pill */}
          <div className="relative shrink-0">
            <select
              aria-label="Filter by brand"
              value={filters.brand}
              onChange={(e) => onChange({ ...filters, brand: e.target.value })}
              className={selectClass(filters.brand !== 'all')}
            >
              <option value="all">Brand</option>
              <option value="Apple">Apple</option>
              <option value="Samsung">Samsung</option>
              <option value="Google">Google</option>
              <option value="HP">HP</option>
              <option value="Dell">Dell</option>
              <option value="Lenovo">Lenovo</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#716B7B] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
          </div>

          {/* Color Dropdown Pill */}
          <div className="relative shrink-0">
            <select
              aria-label="Filter by color"
              value={filters.color}
              onChange={(e) => onChange({ ...filters, color: e.target.value })}
              className={selectClass(filters.color !== 'all')}
            >
              <option value="all">Color</option>
              <option value="Black">Black</option>
              <option value="Purple">Purple</option>
              <option value="Gold">Gold</option>
              <option value="Blue">Blue</option>
              <option value="Silver">Silver</option>
              <option value="Green">Green</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#716B7B] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
          </div>

          {/* Storage Dropdown Pill */}
          <div className="relative shrink-0">
            <select
              aria-label="Filter by storage"
              value={filters.storage}
              onChange={(e) => onChange({ ...filters, storage: e.target.value })}
              className={selectClass(filters.storage !== 'all')}
            >
              <option value="all">Storage</option>
              <option value="64GB">64GB</option>
              <option value="128GB">128GB</option>
              <option value="256GB">256GB</option>
              <option value="512GB">512GB</option>
              <option value="1TB">1TB</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#716B7B] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
          </div>

          {/* Grade Dropdown Pill */}
          <div className="relative shrink-0">
            <select
              aria-label="Filter by cosmetic grade"
              value={filters.grade}
              onChange={(e) =>
                onChange({ ...filters, grade: e.target.value as CosmeticGrade | 'all' })
              }
              className={selectClass(filters.grade !== 'all')}
            >
              <option value="all">Cosmetic Grade</option>
              <option value="Grade A">Excellent (Grade A)</option>
              <option value="Grade B">Very Good (Grade B)</option>
              <option value="Grade C">Good (Grade C)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#716B7B] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
          </div>

          {/* Functionality Dropdown Pill */}
          <div className="relative shrink-0">
            <select
              aria-label="Filter by functionality status"
              value={filters.functionalStatus || 'all'}
              onChange={(e) =>
                onChange({
                  ...filters,
                  functionalStatus: e.target.value as CatalogToolbarFilters['functionalStatus'],
                })
              }
              className={selectClass(
                Boolean(filters.functionalStatus && filters.functionalStatus !== 'all')
              )}
            >
              <option value="all">Functionality</option>
              <option value="Fully Functional">Fully Functional</option>
              <option value="Functional With Disclosed Limitations">With Limitations</option>
              <option value="Not Tested">Not Tested</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#716B7B] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
          </div>

          {/* SIM / Network Dropdown Pill */}
          <div className="relative shrink-0">
            <select
              aria-label="Filter by SIM and network status"
              value={filters.simFilter || 'all'}
              onChange={(e) =>
                onChange({
                  ...filters,
                  simFilter: e.target.value as CatalogToolbarFilters['simFilter'],
                })
              }
              className={selectClass(Boolean(filters.simFilter && filters.simFilter !== 'all'))}
            >
              <option value="all">SIM / Network</option>
              <option value="unlocked">SIM Unlocked</option>
              <option value="locked">SIM Locked</option>
              <option value="wifi_only">Wi-Fi Only</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#716B7B] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {(isDirty || typeof totalCount === 'number') && (
          <div className="shrink-0 flex items-center gap-2 pl-1">
            {isDirty && (
              <button
                type="button"
                onClick={() => onChange(DEFAULT_CATALOG_TOOLBAR_FILTERS)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-[#D9534F]/40 bg-[#D9534F]/8 text-[#D9534F] text-xs font-medium min-h-[34px] hover:bg-[#D9534F]/15"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}

            {typeof totalCount === 'number' && (
              <span className="text-[11px] text-[#716B7B] whitespace-nowrap shrink-0 tabular-nums hidden sm:inline">
                {totalCount} item{totalCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogFilterBar;
