import React, { useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, Heart, MapPin, Star } from 'lucide-react';
import { DeviceListing, ProductColorSwatch } from '../../types/marketplace';
import {
  buildConditionStatement,
  getPrimaryCardWarning,
  mapCosmeticGrade,
} from '../../utils/deviceCondition';
import { formatNaira } from '../../utils/marketplace';
import { getCardReviewDisplay } from '../../utils/homeUiPolicy';
import { getListingVendorState, getShortStateLabel } from '../../utils/nigerianStates';
import { resolveColorHex } from '../../utils/productConfig';
import { SmartImage } from '../common/SmartImage';

interface ProductCardProps {
  listing: DeviceListing;
  onViewDetails: (listing: DeviceListing) => void;
  onAddToCart?: (listing: DeviceListing) => void;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
}

function buildSwatchesForListing(listing: DeviceListing): ProductColorSwatch[] {
  if (listing.colorSwatches && listing.colorSwatches.length > 0) {
    return listing.colorSwatches;
  }

  const seen = new Map<string, ProductColorSwatch>();
  const add = (name: string, image?: string) => {
    const clean = name.trim();
    if (!clean) return;
    if (!seen.has(clean.toLowerCase())) {
      seen.set(clean.toLowerCase(), {
        name: clean,
        hex: resolveColorHex(clean),
        image: image || listing.images[0],
      });
    }
  };

  add(listing.color, listing.images[0]);
  listing.variations?.forEach((v) => add(v.color, v.images?.[0] || listing.images[0]));
  return Array.from(seen.values());
}

function formatCardTitle(
  listing: DeviceListing,
  swatches: ProductColorSwatch[],
  activeColor: string
): string {
  if (!activeColor || activeColor.toLowerCase() === listing.color.toLowerCase()) {
    return listing.title;
  }
  const baseColor = listing.color;
  if (baseColor && listing.title.toLowerCase().includes(baseColor.toLowerCase())) {
    const regex = new RegExp(baseColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return listing.title.replace(regex, activeColor);
  }
  for (const sw of swatches) {
    if (listing.title.toLowerCase().includes(sw.name.toLowerCase())) {
      const regex = new RegExp(sw.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      return listing.title.replace(regex, activeColor);
    }
  }
  return `${listing.title} (${activeColor})`;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  listing,
  onViewDetails,
  onAddToCart,
  isSaved = false,
  onToggleSave,
}) => {
  const swatches = useMemo(() => buildSwatchesForListing(listing), [listing]);
  const [selectedColor, setSelectedColor] = useState<string>(
    swatches[0]?.name || listing.color
  );

  const activeSwatch =
    swatches.find((sw) => sw.name.toLowerCase() === selectedColor.toLowerCase()) || swatches[0];
  const displayImage = activeSwatch?.image || listing.images[0];
  const displayTitle = formatCardTitle(listing, swatches, activeSwatch?.name || listing.color);

  const { modelRating, modelReviewCount, sellerRating } = useMemo(
    () => getCardReviewDisplay(listing),
    [listing]
  );

  const promoLabel = listing.promoBadge || (listing.freeGift ? 'FREE GIFT' : undefined);
  const isDealOfWeek = promoLabel === 'DEAL OF THE WEEK';
  const isComboBundle = Boolean(listing.bundleItems && listing.bundleItems.length >= 2);
  const vendorShortState = getShortStateLabel(getListingVendorState(listing));

  const mappedGrade = useMemo(
    () => mapCosmeticGrade(listing.cosmeticGrade),
    [listing.cosmeticGrade]
  );
  const conditionStatement = useMemo(
    () => buildConditionStatement({ listing }),
    [listing]
  );
  const primaryWarning = useMemo(
    () => getPrimaryCardWarning(listing),
    [listing]
  );
  const storageLabel = listing.storage || listing.storageCapacity;

  return (
    <article className="group bg-white rounded-2xl border border-[#EAE6F0] shadow-sm hover:shadow-md hover:border-[#A981FF] transition-all duration-200 p-3 flex flex-col justify-between">
      <div>
        {/* 1. Image Container */}
        <div className="aspect-square bg-[#F7F6FA] rounded-xl relative flex items-center justify-center p-2 overflow-hidden">
          <button
            type="button"
            onClick={() => onViewDetails(listing)}
            className="w-full h-full flex items-center justify-center focus:outline-none"
            aria-label={`View details for ${displayTitle}`}
          >
            {isComboBundle && listing.bundleItems ? (
              <div className="grid grid-cols-2 gap-1.5 w-full h-full items-center relative">
                {listing.bundleItems.slice(0, 2).map((bItem, bIdx) => (
                  <div
                    key={`${bItem.listingId}-${bIdx}`}
                    className="h-full w-full rounded-lg bg-white border border-[#EAE6F0] p-1 flex items-center justify-center overflow-hidden"
                  >
                    <SmartImage
                      src={bItem.image || displayImage}
                      alt={bItem.title}
                      category={listing.category}
                      className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-200"
                    />
                  </div>
                ))}
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#A981FF] text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                  +
                </span>
              </div>
            ) : (
              <SmartImage
                src={displayImage}
                alt={displayTitle}
                category={listing.category}
                className="w-full h-full object-contain mix-blend-multiply group-hover:scale-[1.03] transition-transform duration-200"
              />
            )}
          </button>

          {/* Cosmetic Grade Micro-Tag (Top-left) */}
          <span
            data-testid="card-cosmetic-grade"
            className="absolute top-1.5 left-1.5 max-w-[calc(100%-2.75rem)] px-1.5 py-0.5 rounded-md bg-white/95 border border-[#D0BCFC] text-[8.5px] sm:text-[9px] font-semibold tracking-wide text-[#30102F] truncate pointer-events-none"
          >
            <span className="sm:hidden">{mappedGrade.shortBadge}</span>
            <span className="hidden sm:inline">{mappedGrade.badgeText}</span>
          </span>

          {/* Save Heart Button (Top-right) */}
          {onToggleSave && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(listing.id);
              }}
              aria-label={isSaved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}
              className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${
                isSaved
                  ? 'bg-[#A981FF] border-[#A981FF] text-white'
                  : 'bg-white/95 border-[#EAE6F0] text-[#716B7B] hover:border-[#A981FF] hover:text-[#A981FF]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          )}

          {/* Vendor Promo / Deal Overlay Pill (Bottom-right) */}
          {promoLabel && (
            <span
              className={`absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md text-[9px] font-semibold tracking-wide pointer-events-none ${
                isDealOfWeek
                  ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                  : promoLabel === 'GIFT PACK'
                  ? 'bg-[#ECFDF5] text-[#238653] border border-[#A7F3D0]'
                  : 'bg-[#F5F0FF] text-[#30102F] border border-[#D0BCFC]'
              }`}
            >
              {promoLabel}
            </span>
          )}
        </div>

        {/* 2. Brand & Storage Capacity Row */}
        <div className="flex items-center justify-between gap-1.5 mt-2.5 text-[11px] min-h-[20px]">
          <span className="text-[#716B7B] font-medium truncate">{listing.brand}</span>
          {storageLabel && (
            <span className="px-1.5 py-0.5 rounded bg-[#FAF9FC] border border-[#EAE6F0] text-[10px] font-medium text-[#30102F] shrink-0">
              {storageLabel}
            </span>
          )}
        </div>

        {/* 3. Product Title */}
        <button
          type="button"
          onClick={() => onViewDetails(listing)}
          className="text-left block w-full mt-1"
        >
          <h3 className="text-[13px] font-medium text-[#211B2B] group-hover:text-[#A981FF] transition-colors line-clamp-2 leading-snug min-h-[2.25rem]">
            {displayTitle}
          </h3>
        </button>

        {/* 4. Concise Qualified Condition Statement */}
        <p
          data-testid="card-condition-statement"
          className="mt-1 text-[11px] text-[#4A4356] line-clamp-2 leading-snug min-h-[1.875rem]"
        >
          {conditionStatement}
        </p>

        {/* Direct Card Warning Callout for Limitations / SIM Lock / Replaced Part / Untested */}
        {primaryWarning && (
          <div
            data-testid="card-limitation-warning"
            className={`mt-1.5 px-2 py-1 rounded-lg border text-[10px] font-medium flex items-center gap-1.5 ${
              primaryWarning.tone === 'danger'
                ? 'bg-[#FFF5F5] border-[#FED7D7] text-[#C53030]'
                : 'bg-[#FEF3C7]/60 border-[#FDE68A] text-[#92400E]'
            }`}
          >
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span className="truncate">{primaryWarning.label}</span>
          </div>
        )}

        {/* 5. Pricing Row (13px semi-bold + optional strikethrough) */}
        <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5 tabular-nums">
          <span className="text-[13px] font-semibold text-[#211B2B]">
            {listing.priceHasStartingPrefix ? 'From ' : ''}
            {formatNaira(listing.price)}
          </span>
          {listing.originalPrice && listing.originalPrice > listing.price && (
            <span className="text-[11px] text-[#716B7B] line-through">
              {formatNaira(listing.originalPrice)}
            </span>
          )}
        </div>

        {/* 6. Interactive Color Swatch Dots or 1-Tap Add Bundle */}
        {isComboBundle && onAddToCart ? (
          <div className="mt-2 space-y-1.5">
            <div className="text-[10px] text-[#716B7B] truncate">
              Includes {listing.bundleItems?.length} bundled items
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(listing);
              }}
              className="w-full py-1.5 px-2.5 rounded-xl bg-[#F5F0FF] hover:bg-[#A981FF] text-[#30102F] hover:text-white border border-[#D0BCFC] text-[11px] font-semibold transition-colors"
            >
              Add Bundle
            </button>
          </div>
        ) : (
          swatches.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2" role="group" aria-label="Color swatches">
              {swatches.slice(0, 5).map((sw) => {
                const isActive = sw.name.toLowerCase() === (activeSwatch?.name || '').toLowerCase();
                return (
                  <button
                    key={sw.name}
                    type="button"
                    title={sw.name}
                    aria-label={`Preview ${listing.model} in ${sw.name}`}
                    aria-pressed={isActive}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedColor(sw.name);
                    }}
                    className={`w-4 h-4 rounded-full border border-black/15 transition-all ${
                      isActive ? 'ring-2 ring-[#A981FF] ring-offset-1 scale-105' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: sw.hex }}
                  />
                );
              })}
            </div>
          )
        )}
      </div>

      {/* 7. Separated Model Reviews & Vendor Identity Footer */}
      <button
        type="button"
        onClick={() => onViewDetails(listing)}
        className="border-t border-[#EAE6F0] pt-2 mt-2.5 flex flex-col gap-1 text-left w-full"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-0.5 w-full text-[9.5px] sm:text-[10px] text-[#716B7B]">
          {modelRating !== null ? (
            <span
              data-testid="card-model-review"
              className="inline-flex items-center gap-1 text-[#238653] font-medium tabular-nums whitespace-nowrap"
            >
              <Star className="w-2.5 h-2.5 fill-[#238653] text-[#238653] shrink-0" />
              <span>
                Model {modelRating.toFixed(2)}
                {modelReviewCount !== null ? ` (${modelReviewCount})` : ''}
              </span>
            </span>
          ) : (
            <span data-testid="card-model-review-empty" className="text-[#716B7B] whitespace-nowrap">
              No device reviews yet
            </span>
          )}
          {sellerRating !== null && (
            <span
              data-testid="card-seller-rating"
              className="inline-flex items-center gap-0.5 font-medium text-[#211B2B] tabular-nums whitespace-nowrap shrink-0"
            >
              <Star className="w-2.5 h-2.5 fill-[#211B2B] text-[#211B2B]" />
              <span>Seller {sellerRating.toFixed(1)}</span>
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-1.5 w-full">
          <span className="inline-flex items-center gap-1 text-[11px] text-[#4A4356] font-medium truncate min-w-0">
            <span className="truncate">{listing.sellerName}</span>
            {listing.sellerVerified && (
              <BadgeCheck className="w-3.5 h-3.5 text-[#A981FF] shrink-0" />
            )}
          </span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#F5F0FF] text-[#30102F] text-[10px] font-medium shrink-0">
            <MapPin className="w-2.5 h-2.5 text-[#A981FF] shrink-0" />
            {vendorShortState}
          </span>
        </div>
      </button>
    </article>
  );
};

export default ProductCard;
