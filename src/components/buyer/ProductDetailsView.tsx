import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  Battery,
  Globe,
  MessageSquare,
  ShoppingCart,
  Store,
  Share2,
  Clock,
  Star,
  Calendar,
  Plus,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Gift,
  BadgeCheck,
  MapPin,
} from 'lucide-react';
import {
  AccessoryItem,
  CartItem,
  DeviceListing,
  LaptopConditionReport,
  PhoneConditionReport,
  ProductVariation,
} from '../../types/marketplace';
import { formatNaira } from '../../utils/marketplace';
import { getListingVendorState, getShortStateLabel } from '../../utils/nigerianStates';
import {
  FLAGSHIP_IPHONE_15_PRO_MAX_LISTING,
  FLAGSHIP_SETUP_ACCESSORIES,
  IPHONE_15_PRO_MODELS,
} from '../../data/flagshipIphone15Data';
import { INITIAL_REVIEWS, POPULAR_ACCESSORIES } from '../../data/mockData';
import {
  IPHONE_12_VARIATIONS,
  IPHONE_13_PRO_VARIATIONS,
  MACBOOK_PRO_M2_VARIATIONS,
} from '../../data/variationsData';
import {
  formatYearMadeDisplay,
  sanitizeConditionText,
  toSimpleEnglish,
} from '../../utils/simpleEnglish';
import {
  buildConfiguredVariation,
  buildFlagshipGradeOptions,
  buildGenericGradeOptions,
  calculateConfiguredTotal,
  ColorOptionConfig,
  ConfiguratorGradeKey,
  resolveColorHex,
} from '../../utils/productConfig';
import { SmartImage } from '../common/SmartImage';
import { TrustTileIcon } from '../common/TrustGraphics';

interface ProductDetailsViewProps {
  listing: DeviceListing;
  allListings?: DeviceListing[];
  inspectionHours?: number;
  onBack: () => void;
  onAddToCart: (
    listing: DeviceListing,
    selectedAccessories?: AccessoryItem[],
    selectedVariation?: ProductVariation
  ) => void;
  onBuyNow: (
    listing: DeviceListing,
    selectedAccessories?: AccessoryItem[],
    selectedVariation?: ProductVariation
  ) => void;
  onMessageSeller: (listing: DeviceListing) => void;
  onViewVendorStorefront: (vendorId: string) => void;
  editingCartItem?: CartItem | null;
  onSaveEditedCartItem?: (
    cartItemId: string,
    listing: DeviceListing,
    selectedAccessories?: AccessoryItem[],
    selectedVariation?: ProductVariation
  ) => void;
  onOpenHowItWorks: () => void;
  onOpenBuyerProtection: () => void;
  onOpenInspectionEducationModal?: () => void;
}

export const ProductDetailsView: React.FC<ProductDetailsViewProps> = ({
  listing,
  allListings = [],
  inspectionHours = 24,
  onBack,
  onAddToCart,
  onBuyNow,
  onMessageSeller,
  onViewVendorStorefront,
  editingCartItem = null,
  onSaveEditedCartItem,
  onOpenHowItWorks,
  onOpenBuyerProtection,
  onOpenInspectionEducationModal,
}) => {
  const isFlagshipSeries =
    listing.id === FLAGSHIP_IPHONE_15_PRO_MAX_LISTING.id ||
    listing.model.toLowerCase().includes('iphone 15 pro');

  const [selectedModelId, setSelectedModelId] = useState<
    'iphone-15-pro-max-256' | 'iphone-15-pro-128'
  >('iphone-15-pro-max-256');
  const [selectedColorName, setSelectedColorName] = useState<string>(
    isFlagshipSeries ? 'Natural Titanium' : listing.color
  );
  const [selectedGrade, setSelectedGrade] = useState<ConfiguratorGradeKey>(
    (listing.cosmeticGrade as ConfiguratorGradeKey) === 'Grade A' ||
      (listing.cosmeticGrade as ConfiguratorGradeKey) === 'Grade B' ||
      (listing.cosmeticGrade as ConfiguratorGradeKey) === 'Grade C'
      ? (listing.cosmeticGrade as ConfiguratorGradeKey)
      : 'Grade B'
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedAccessories, setSelectedAccessories] = useState<AccessoryItem[]>([]);
  const [honestyReportExpanded, setHonestyReportExpanded] = useState(true);
  const [justAddedToast, setJustAddedToast] = useState(false);

  const touchStartXRef = useRef<number | null>(null);

  const isEditingThisCartItem = Boolean(editingCartItem && editingCartItem.listing.id === listing.id);

  // Sync defaults cleanly when navigating to a different listing or entering Edit Cart Item mode
  useEffect(() => {
    const flagship =
      listing.id === FLAGSHIP_IPHONE_15_PRO_MAX_LISTING.id ||
      listing.model.toLowerCase().includes('iphone 15 pro');
    if (editingCartItem && editingCartItem.listing.id === listing.id) {
      if (flagship && editingCartItem.selectedVariation?.storage?.includes('128')) {
        setSelectedModelId('iphone-15-pro-128');
      } else {
        setSelectedModelId('iphone-15-pro-max-256');
      }
      setSelectedColorName(
        editingCartItem.selectedVariation?.color || editingCartItem.listing.color || 'Black'
      );
      const editGrade = editingCartItem.selectedVariation?.grade || editingCartItem.listing.cosmeticGrade;
      setSelectedGrade(
        editGrade === 'Grade A' || editGrade === 'Grade B' || editGrade === 'Grade C'
          ? editGrade
          : 'Grade B'
      );
      setSelectedAccessories(editingCartItem.selectedAccessories || []);
      setSelectedImageIndex(0);
      setHonestyReportExpanded(true);
      return;
    }

    setSelectedModelId('iphone-15-pro-max-256');
    const firstVar = !flagship && listing.variations?.length ? listing.variations[0] : null;
    const initialColor = flagship ? 'Natural Titanium' : listing.color || firstVar?.color || 'Black';
    setSelectedColorName(initialColor);
    const matchingColorVar =
      !flagship && listing.variations?.length
        ? listing.variations.find((v) => v.color.toLowerCase() === initialColor.toLowerCase()) || firstVar
        : null;
    const defaultGrade = matchingColorVar?.grade || listing.cosmeticGrade;
    setSelectedGrade(
      defaultGrade === 'Grade A' ||
        defaultGrade === 'Grade B' ||
        defaultGrade === 'Grade C'
        ? defaultGrade
        : 'Grade B'
    );
    setSelectedImageIndex(0);
    setSelectedAccessories([]);
    setHonestyReportExpanded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id, editingCartItem?.id]);

  const genericVariationsList: ProductVariation[] = useMemo(() => {
    if (listing.variations && listing.variations.length > 0) return listing.variations;
    if (listing.id === 'dev-phone-10') return IPHONE_12_VARIATIONS;
    if (listing.id === 'dev-phone-2') return IPHONE_13_PRO_VARIATIONS;
    if (listing.title.toLowerCase().includes('macbook pro 14')) return MACBOOK_PRO_M2_VARIATIONS;
    return [];
  }, [listing]);

  const activeFlagshipModel = useMemo(
    () =>
      IPHONE_15_PRO_MODELS.find((m) => m.id === selectedModelId) ||
      IPHONE_15_PRO_MODELS[0],
    [selectedModelId]
  );

  // Color options for Section B
  const colorOptions = useMemo<
    Array<{
      name: string;
      hex: string;
      images: string[];
      totalStock: number;
      flagshipConfig?: ColorOptionConfig;
    }>
  >(() => {
    if (isFlagshipSeries) {
      return activeFlagshipModel.colors.map((c) => ({
        name: c.name,
        hex: c.hex,
        images: c.images,
        totalStock: c.gradeStock['Grade C'] + c.gradeStock['Grade B'] + c.gradeStock['Grade A'],
        flagshipConfig: c,
      }));
    }

    const colorMap = new Map<
      string,
      { name: string; hex: string; images: string[]; totalStock: number; flagshipConfig?: ColorOptionConfig }
    >();
    const addColor = (name: string, imgs: string[] = [], stock = 2) => {
      const key = name.trim();
      if (!key) return;
      const existing = colorMap.get(key);
      if (existing) {
        existing.totalStock += stock;
        if (imgs.length > 0 && existing.images.length === 0) {
          existing.images = imgs;
        }
      } else {
        colorMap.set(key, {
          name: key,
          hex: resolveColorHex(key),
          images: imgs.length > 0 ? imgs : listing.images,
          totalStock: stock,
        });
      }
    };

    genericVariationsList.forEach((v) => {
      addColor(v.color, v.images || [], v.isAvailable ? v.stockQuantity : 0);
    });
    if (colorMap.size === 0) {
      addColor(listing.color, listing.images, listing.stockQuantity ?? 3);
    }

    return Array.from(colorMap.values());
  }, [isFlagshipSeries, activeFlagshipModel, genericVariationsList, listing]);

  const activeColorOption =
    colorOptions.find((c) => c.name.toLowerCase() === selectedColorName.toLowerCase()) ||
    colorOptions[0];

  const gradeOptions = useMemo(() => {
    if (isFlagshipSeries && 'flagshipConfig' in activeColorOption && activeColorOption.flagshipConfig) {
      return buildFlagshipGradeOptions(activeFlagshipModel, activeColorOption.flagshipConfig);
    }
    return buildGenericGradeOptions(listing, activeColorOption.name, genericVariationsList);
  }, [isFlagshipSeries, activeColorOption, activeFlagshipModel, listing, genericVariationsList]);

  const activeGradeCard = useMemo(() => {
    const chosen = gradeOptions.find((g) => g.grade === selectedGrade);
    if (chosen && chosen.stock > 0) return chosen;
    return gradeOptions.find((g) => g.stock > 0) || chosen || gradeOptions[0];
  }, [gradeOptions, selectedGrade]);

  const matchedGenericVariation = useMemo(() => {
    if (isFlagshipSeries || genericVariationsList.length === 0) return null;
    return (
      genericVariationsList.find(
        (u) =>
          u.color.toLowerCase() === activeColorOption.name.toLowerCase() &&
          u.grade === activeGradeCard.grade
      ) || null
    );
  }, [isFlagshipSeries, genericVariationsList, activeColorOption.name, activeGradeCard.grade]);

  // Keep selectedGrade synced if user picks a color where previous grade is sold out
  useEffect(() => {
    const exact = gradeOptions.find((g) => g.grade === selectedGrade);
    if (exact && exact.stock === 0) {
      const fallback = gradeOptions.find((g) => g.stock > 0);
      if (fallback) {
        setSelectedGrade(fallback.grade);
      }
    }
  }, [activeColorOption.name, selectedModelId, gradeOptions, selectedGrade]);

  const galleryImages = useMemo(() => {
    const imgs = matchedGenericVariation?.images?.length
      ? matchedGenericVariation.images
      : activeColorOption.images?.length
      ? activeColorOption.images
      : listing.images;
    return imgs.length > 0 ? imgs : [''];
  }, [matchedGenericVariation, activeColorOption.images, listing.images]);

  const safeImageIndex = Math.min(selectedImageIndex, Math.max(0, galleryImages.length - 1));

  const activeTitle = isFlagshipSeries ? activeFlagshipModel.title : listing.title;
  const activeStorage = isFlagshipSeries
    ? activeFlagshipModel.storage
    : matchedGenericVariation?.storage || listing.storage || listing.storageCapacity || 'Standard';
  const activeRating = isFlagshipSeries ? activeFlagshipModel.rating : listing.sellerRating;
  const activeReviewCount = isFlagshipSeries
    ? activeFlagshipModel.reviewCount
    : Math.max(24, listing.sellerSalesCount);
  const activeDevicePrice = activeGradeCard.price;
  const activeRetailPrice = isFlagshipSeries
    ? activeFlagshipModel.retailReferencePrice
    : matchedGenericVariation?.originalPrice ||
      listing.originalPrice ||
      Math.round(activeDevicePrice * 1.25);

  const liveTotalPrice = calculateConfiguredTotal(activeDevicePrice, selectedAccessories);

  const activeColorStock = useMemo(
    () => gradeOptions.reduce((sum, g) => sum + g.stock, 0),
    [gradeOptions]
  );

  // Combine listing faults & grade-specific plain-English faults
  const combinedDisclosedIssues = useMemo(() => {
    const list: { label: string; description: string }[] = [];
    const pushIssue = (label: string, description: string) => {
      if (!label) return;
      if (!list.some((x) => x.label.toLowerCase() === label.toLowerCase())) {
        list.push({ label, description });
      }
    };

    if (isFlagshipSeries) {
      activeGradeCard.disclosedIssues.forEach((issue) => {
        pushIssue(issue.label, sanitizeConditionText(issue.description));
      });
    } else {
      activeGradeCard.disclosedIssues.forEach((issue) => {
        const translated = toSimpleEnglish(issue.label);
        pushIssue(translated.label, sanitizeConditionText(issue.description || translated.explanation));
      });
      if (listing.isWifiOnly) {
        const wifiTranslated = toSimpleEnglish('Wi-Fi Only');
        pushIssue(wifiTranslated.label, wifiTranslated.explanation);
      }
    }
    return list;
  }, [isFlagshipSeries, activeGradeCard.disclosedIssues, listing.isWifiOnly]);

  // Accessories setup: same-vendor paid accessories + FREE GIFT tempered glass (deduplicated by ID)
  const setupAccessories = useMemo(() => {
    const primary = listing.availableAccessories?.[0] || FLAGSHIP_SETUP_ACCESSORIES.charger;
    const freeProtector = FLAGSHIP_SETUP_ACCESSORIES.screenProtectorGift;
    const candidates = [
      primary,
      ...(!isFlagshipSeries
        ? [
            ...(listing.availableAccessories?.slice(1, 2) || []),
            ...POPULAR_ACCESSORIES.filter((p) => p.id !== primary.id).slice(0, 1),
          ]
        : []),
    ];
    const seenIds = new Set<string>([freeProtector.id]);
    const paidItems: AccessoryItem[] = [];
    for (const item of candidates) {
      if (item && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        paidItems.push(item);
        if (paidItems.length >= (isFlagshipSeries ? 1 : 2)) break;
      }
    }
    return {
      paidItems,
      freeGiftItem: freeProtector,
    };
  }, [listing.availableAccessories, isFlagshipSeries]);

  const configuredVariation: ProductVariation = useMemo(() => {
    const base = buildConfiguredVariation({
      id:
        matchedGenericVariation?.id ||
        `cfg-${isFlagshipSeries ? activeFlagshipModel.id : listing.id}-${activeColorOption.name
          .toLowerCase()
          .replace(/\s+/g, '-')}-${activeGradeCard.grade.toLowerCase().replace(/\s+/g, '')}`,
      color: matchedGenericVariation?.color || activeColorOption.name,
      storage: activeStorage,
      ram: listing.ram,
      grade: activeGradeCard.grade,
      price: activeDevicePrice,
      originalPrice: activeRetailPrice,
      stockQuantity: activeGradeCard.stock,
      batteryHealth: activeGradeCard.batteryHealth,
      images: galleryImages,
      disclosedFaults: combinedDisclosedIssues.map((i) => i.label),
      conditionSummary: activeGradeCard.cosmeticNotes,
      simStatus: matchedGenericVariation?.simStatus || listing.simStatus || 'Unlocked (Physical + eSIM)',
    });
    return matchedGenericVariation?.unitLabel
      ? { ...base, unitLabel: matchedGenericVariation.unitLabel }
      : base;
  }, [
    matchedGenericVariation,
    isFlagshipSeries,
    activeFlagshipModel.id,
    listing.id,
    listing.ram,
    listing.simStatus,
    activeColorOption.name,
    activeStorage,
    activeGradeCard,
    activeDevicePrice,
    activeRetailPrice,
    galleryImages,
    combinedDisclosedIssues,
  ]);

  const configuredListingForCart: DeviceListing = useMemo(
    () => ({
      ...listing,
      title: activeTitle,
      storage: activeStorage,
      color: activeColorOption.name,
      price: activeDevicePrice,
      cosmeticGrade: activeGradeCard.grade,
      batteryHealth: activeGradeCard.batteryHealth,
      images: galleryImages,
      freeGift: {
        title: setupAccessories.freeGiftItem.name,
        description: setupAccessories.freeGiftItem.description,
        value: 5000,
        eligible: true,
      },
    }),
    [
      listing,
      activeTitle,
      activeStorage,
      activeColorOption.name,
      activeDevicePrice,
      activeGradeCard.grade,
      activeGradeCard.batteryHealth,
      galleryImages,
      setupAccessories.freeGiftItem,
    ]
  );

  const years = formatYearMadeDisplay(
    listing.modelYear,
    listing.yearMade,
    listing.yearMadePrecision,
    listing.yearPurchased
  );

  const isPhone = listing.category === 'phones';
  const isLaptop = listing.category === 'laptops';
  const phoneReport = isPhone ? (listing.conditionReport as PhoneConditionReport) : null;
  const laptopReport = isLaptop ? (listing.conditionReport as LaptopConditionReport) : null;

  const reviews = INITIAL_REVIEWS.filter(
    (r) => r.listingId === listing.id || r.vendorId === listing.sellerId
  );

  const toggleAccessory = (acc: AccessoryItem) => {
    setSelectedAccessories((prev) =>
      prev.some((a) => a.id === acc.id)
        ? prev.filter((a) => a.id !== acc.id)
        : [...prev, acc]
    );
  };

  const handleCopyShare = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const handleSelectColor = (colorName: string) => {
    setSelectedColorName(colorName);
    if (!isFlagshipSeries && genericVariationsList.length > 0) {
      const exactMatch = genericVariationsList.find(
        (u) =>
          u.color.toLowerCase() === colorName.toLowerCase() &&
          u.grade === selectedGrade &&
          u.isAvailable &&
          u.stockQuantity > 0
      );
      if (!exactMatch) {
        const matchingUnit = genericVariationsList.find(
          (u) =>
            u.color.toLowerCase() === colorName.toLowerCase() &&
            u.isAvailable &&
            u.stockQuantity > 0
        );
        if (
          matchingUnit &&
          (matchingUnit.grade === 'Grade A' ||
            matchingUnit.grade === 'Grade B' ||
            matchingUnit.grade === 'Grade C')
        ) {
          setSelectedGrade(matchingUnit.grade);
        }
      }
    }
    setSelectedImageIndex(0);
  };

  const handleSelectGrade = (grade: ConfiguratorGradeKey) => {
    setSelectedGrade(grade);
    setSelectedImageIndex(0);
  };

  const handleGalleryPrev = () => {
    setSelectedImageIndex((prev) => (prev <= 0 ? galleryImages.length - 1 : prev - 1));
  };

  const handleGalleryNext = () => {
    setSelectedImageIndex((prev) => (prev >= galleryImages.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const diff = touchStartXRef.current - endX;
    if (Math.abs(diff) > 36) {
      if (diff > 0) handleGalleryNext();
      else handleGalleryPrev();
    }
    touchStartXRef.current = null;
  };

  const handleAddToCartAction = () => {
    if (activeGradeCard.stock <= 0) return;
    if (isEditingThisCartItem && editingCartItem?.id && onSaveEditedCartItem) {
      onSaveEditedCartItem(
        editingCartItem.id,
        configuredListingForCart,
        selectedAccessories,
        configuredVariation
      );
      setJustAddedToast(true);
      setTimeout(() => setJustAddedToast(false), 2000);
      return;
    }
    onAddToCart(configuredListingForCart, selectedAccessories, configuredVariation);
    setJustAddedToast(true);
    setTimeout(() => setJustAddedToast(false), 2000);
  };

  const photoEvidenceLabel = useMemo(() => {
    const src = galleryImages[safeImageIndex] || '';
    const isCustomUnitPhoto =
      src.startsWith('data:') ||
      src.includes('actual') ||
      Boolean(listing.variations && listing.variations.length > 0 && listing.foreignUsedStatus === 'Verified Foreign-Used' && safeImageIndex > 0);
    return isCustomUnitPhoto ? 'Actual Unit Photo' : 'Representative Model Photo';
  }, [galleryImages, safeImageIndex, listing.variations, listing.foreignUsedStatus]);

  return (
    <div className="bg-[#FAF9FC] min-h-screen overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-36 space-y-8 min-w-0">
        {/* Top Breadcrumb Bar */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#211B2B] hover:text-[#A981FF] min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#EAE6F0] text-xs font-medium text-[#716B7B]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#A981FF]" />
              Know Exactly What You’re Buying.
            </span>
            <button
              type="button"
              onClick={handleCopyShare}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EAE6F0] bg-white text-xs font-medium text-[#211B2B] hover:border-[#A981FF] min-h-[40px]"
            >
              <Share2 className="w-3.5 h-3.5 text-[#A981FF]" />
              {copiedLink ? 'Link Copied' : 'Share'}
            </button>
          </div>
        </div>

        {/* Main Split: A. Gallery (Left) + B/C/D Configurator (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* LEFT: Swipeable Image Gallery + Provenance */}
          <div className="lg:col-span-6 lg:sticky lg:top-28 space-y-3.5 min-w-0">
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white border border-[#EAE6F0] group"
            >
              <button
                type="button"
                onClick={() => setIsZoomOpen(true)}
                className="w-full h-full block focus:outline-none"
                aria-label={`Enlarge ${activeTitle} in ${activeColorOption.name}`}
              >
                <SmartImage
                  src={galleryImages[safeImageIndex]}
                  alt={`${activeTitle} - ${activeColorOption.name}`}
                  category={listing.category}
                  className="w-full h-full object-contain bg-white p-2 transition-transform duration-300"
                />
              </button>

              {/* Top Condition, Color & Photo Evidence Pill */}
              <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg bg-white/95 border border-[#D0BCFC] text-xs font-medium text-[#211B2B]">
                    {listing.condition === 'Brand-New' ? 'Brand New' : 'Foreign Used'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#211B2B]/90 text-white text-xs font-medium">
                    {activeColorOption.name} · {activeGradeCard.grade}
                  </span>
                </div>
                <span
                  data-testid="pdp-photo-evidence-badge"
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                    photoEvidenceLabel === 'Actual Unit Photo'
                      ? 'bg-[#ECFDF5]/95 border-[#A7F3D0] text-[#238653]'
                      : 'bg-[#FAF9FC]/95 border-[#EAE6F0] text-[#4A4356]'
                  }`}
                >
                  {photoEvidenceLabel}
                </span>
              </div>

              {/* Prev / Next Gallery Arrows */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handleGalleryPrev}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-[#EAE6F0] text-[#211B2B] flex items-center justify-center shadow-sm transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleGalleryNext}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-[#EAE6F0] text-[#211B2B] flex items-center justify-center shadow-sm transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Dot Pagination Indicators */}
              {galleryImages.length > 1 && (
                <div
                  role="tablist"
                  aria-label="Gallery photo indicators"
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/90 border border-[#EAE6F0] shadow-xs"
                >
                  {galleryImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      role="tab"
                      aria-selected={safeImageIndex === idx}
                      aria-label={`View photo ${idx + 1}`}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        safeImageIndex === idx
                          ? 'w-5 bg-[#A981FF]'
                          : 'w-2 bg-[#D0BCFC] hover:bg-[#B796FE]'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {galleryImages.map((img, i) => (
                  <button
                    key={`${activeColorOption.name}-${i}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(i)}
                    aria-label={`Select gallery image ${i + 1}`}
                    className={`w-20 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      safeImageIndex === i
                        ? 'border-[#A981FF] ring-2 ring-[#D0BCFC]/50'
                        : 'border-[#EAE6F0] hover:border-[#D0BCFC]'
                    }`}
                  >
                    <SmartImage
                      src={img}
                      alt={`${activeTitle} thumbnail ${i + 1}`}
                      category={listing.category}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Provenance & Inspection Summary Strip */}
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-4 grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[#716B7B] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#A981FF]" />
                  Model Year
                </span>
                <span className="font-semibold text-[#211B2B] block mt-0.5">{years.modelYearText}</span>
              </div>
              <div>
                <span className="text-[#716B7B] block">Year Made</span>
                <span className="font-semibold text-[#211B2B] block mt-0.5">{years.yearMadeText}</span>
              </div>
              <div>
                <span className="text-[#716B7B] flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-[#A981FF]" />
                  Origin
                </span>
                <span className="font-semibold text-[#211B2B] block mt-0.5">{listing.sourceCountry}</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Interactive Configuration Module */}
          <div className="lg:col-span-6 space-y-5 min-w-0">
            {/* Header & Model Switcher Card */}
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#716B7B]">
                  <span className="inline-flex items-center gap-1 font-medium text-[#211B2B]">
                    <Star className="w-3.5 h-3.5 fill-[#A981FF] text-[#A981FF]" />
                    <span>{activeRating.toFixed(1)}</span>
                    <span className="text-[#716B7B] font-normal">
                      · {activeReviewCount} Verified Reviews
                    </span>
                  </span>
                  <span>
                    Batch: <strong className="font-mono text-[#211B2B]">{listing.batchReference}</strong>
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-medium text-[#211B2B] leading-snug">
                  {activeTitle}
                </h1>

                {/* Price & Live Stock Row */}
                <div className="flex flex-wrap items-baseline justify-between gap-3 pt-1">
                  <div className="flex items-baseline gap-2.5">
                    <span
                      data-testid="pdp-live-price"
                      className="text-2xl sm:text-3xl font-semibold text-[#211B2B] tabular-nums"
                    >
                      {formatNaira(liveTotalPrice)}
                    </span>
                    {activeRetailPrice > activeDevicePrice && (
                      <span className="text-sm text-[#716B7B] line-through tabular-nums">
                        {formatNaira(activeRetailPrice)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-[#238653] bg-[#238653]/10 px-2.5 py-1 rounded-full">
                    {activeGradeCard.stock > 0
                      ? `${activeGradeCard.stock} unit(s) ready for dispatch`
                      : 'Sold out in this combination'}
                  </span>
                </div>
              </div>

              {/* Interactive Model / Storage Switcher for iPhone 15 Pro Series */}
              {isFlagshipSeries && (
                <div className="space-y-2 pt-3 border-t border-[#EAE6F0]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#211B2B]">Select Model & Storage</span>
                    <span className="text-[#716B7B]">{activeFlagshipModel.chipset}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {IPHONE_15_PRO_MODELS.map((model) => {
                      const active = model.id === activeFlagshipModel.id;
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            setSelectedModelId(model.id);
                            setSelectedImageIndex(0);
                          }}
                          className={`p-3 rounded-xl text-left transition-all min-h-[56px] ${
                            active
                              ? 'border-2 border-[#A981FF] bg-[#F5F0FF]/40'
                              : 'border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#B796FE]'
                          }`}
                        >
                          <div className="text-xs font-semibold text-[#211B2B]">
                            {model.shortLabel}
                          </div>
                          <div className="text-[11px] text-[#716B7B] mt-0.5 tabular-nums">
                            From {formatNaira(model.baseGradeCPrice)} · {model.screenSize.split(' ')[0]}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bundle Package Breakdown (when viewing a Combo Deal / Gift Pack) */}
              {listing.bundleItems && listing.bundleItems.length >= 2 && (
                <div className="p-3.5 rounded-xl bg-[#F5F0FF] border border-[#D0BCFC] space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#211B2B]">
                    <span>{listing.promoBadge || 'COMBO DEAL'} — Included Items</span>
                    <span className="text-[#238653]">{listing.bundleItems.length} items packed</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {listing.bundleItems.map((bi, bIdx) => (
                      <div
                        key={`${bi.listingId}-${bIdx}`}
                        className="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#EAE6F0]"
                      >
                        <SmartImage
                          src={bi.image}
                          alt={bi.title}
                          category={listing.category}
                          className="w-10 h-10 rounded object-contain shrink-0"
                        />
                        <div className="min-w-0 text-xs">
                          <div className="font-medium text-[#211B2B] truncate">{bi.title}</div>
                          <div className="text-[11px] text-[#716B7B] tabular-nums">
                            Value: {formatNaira(bi.price)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* B. "Choose Your Color" Interactive Swatch Pills */}
              <div className="space-y-2.5 pt-3 border-t border-[#EAE6F0]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#211B2B]">
                    Choose Your Color:{' '}
                    <span className="font-normal text-[#716B7B]">{activeColorOption.name}</span>
                  </span>
                  <span className="text-[#716B7B] tabular-nums">
                    {activeColorStock} available across grades
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {colorOptions.map((c) => {
                    const isSelected =
                      c.name.toLowerCase() === activeColorOption.name.toLowerCase();
                    return (
                      <button
                        key={c.name}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleSelectColor(c.name)}
                        className={`rounded-full px-2.5 py-2 flex items-center gap-1.5 text-xs font-medium min-h-[40px] ${
                          isSelected
                            ? 'border-2 border-[#A981FF] bg-[#F5F0FF] text-[#211B2B] ring-2 ring-[#A981FF]/20'
                            : 'border border-[#EAE6F0] bg-white text-[#211B2B] hover:border-[#B796FE]'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* C. "Choose Your Condition" Stacked Interactive Grading Cards */}
              <div className="space-y-3 pt-3 border-t border-[#EAE6F0]">
                <div>
                  <h2 className="text-sm font-semibold text-[#211B2B]">Choose Your Condition</h2>
                  <p className="text-xs text-[#716B7B] mt-0.5 leading-relaxed">
                    Cosmetic grade describes physical appearance only. Technical status and limitations are disclosed separately below.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {gradeOptions.map((option) => {
                    const isSelected = activeGradeCard.grade === option.grade;
                    const isSoldOut = option.stock <= 0;
                    return (
                      <button
                        key={option.grade}
                        type="button"
                        disabled={isSoldOut}
                        aria-pressed={isSelected}
                        onClick={() => handleSelectGrade(option.grade)}
                        className={`w-full p-3.5 rounded-xl text-left flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-2 border-[#A981FF] bg-[#F5F0FF]'
                            : isSoldOut
                            ? 'border border-[#EAE6F0] bg-[#FAF9FC] opacity-55 cursor-not-allowed'
                            : 'border border-[#EAE6F0] bg-white hover:border-[#B796FE]'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-[#211B2B]">
                              {option.title}
                            </span>
                            {option.priceDelta > 0 && !isSoldOut && (
                              <span className="text-[11px] font-medium text-[#716B7B] tabular-nums">
                                +{formatNaira(option.priceDelta)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#716B7B]">{option.description}</p>
                        </div>

                        <div className="text-right shrink-0">
                          {isSoldOut ? (
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-[#EAE6F0] text-[#716B7B] text-xs font-medium">
                              Sold out
                            </span>
                          ) : (
                            <>
                              <div className="text-sm font-semibold text-[#211B2B] tabular-nums">
                                {formatNaira(option.price)}
                              </div>
                              <div className="text-[11px] text-[#716B7B] tabular-nums">
                                {option.stock} left
                              </div>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* D. Inline Expandable Condition & Honesty Report (No Pop-ups) */}
              <div className="rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] overflow-hidden">
                <button
                  type="button"
                  aria-expanded={honestyReportExpanded}
                  onClick={() => setHonestyReportExpanded((prev) => !prev)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-white/60 transition-colors min-h-[48px]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[#211B2B]">
                      Condition & Honesty Report ({activeGradeCard.grade})
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#D0BCFC] text-[11px] font-medium text-[#211B2B]">
                      <BadgeCheck className="w-3 h-3 text-[#238653]" />
                      Vendor Disclosed
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#EAE6F0] text-[11px] font-medium text-[#238653]">
                      <CheckCircle2 className="w-3 h-3" />
                      Foreign-Use Batch Verified
                    </span>
                  </div>
                  {honestyReportExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#716B7B] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#716B7B] shrink-0" />
                  )}
                </button>

                {honestyReportExpanded && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[#EAE6F0] bg-white">
                    {/* Plain-English Disclosed Issues Box (#D9534F soft red alert) */}
                    {combinedDisclosedIssues.length > 0 ? (
                      <div
                        data-testid="disclosed-issues-alert"
                        className="p-3.5 rounded-xl bg-[#D9534F]/8 border border-[#D9534F]/35 space-y-1.5"
                      >
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#D9534F]">
                          <AlertOctagon className="w-4 h-4 shrink-0" />
                          Disclosed Limitations & Issues ({activeGradeCard.grade})
                        </div>
                        <ul className="space-y-1.5 text-xs text-[#211B2B]">
                          {combinedDisclosedIssues.map((issue, idx) => (
                            <li key={idx} className="leading-relaxed">
                              <span className="font-semibold text-[#D9534F]">• {issue.label}:</span>{' '}
                              {issue.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-[#238653]/8 border border-[#238653]/25 flex items-center gap-2 text-xs text-[#211B2B]">
                        <CheckCircle2 className="w-4 h-4 text-[#238653] shrink-0" />
                        <span>
                          No technical limitations disclosed for this {activeGradeCard.grade} unit. All hardware tests passed cleanly.
                        </span>
                      </div>
                    )}

                    {/* 2-Column Hardware Checklist */}
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#716B7B] mb-2">
                        Hardware Verification Checklist
                      </div>
                      {isLaptop && laptopReport ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {[
                            ['Battery Condition', `${laptopReport.batteryCondition} (${laptopReport.batteryCycleCount} cycles)`],
                            ['Screen Originality', sanitizeConditionText(laptopReport.screenCondition)],
                            ['Keyboard & Trackpad', `${laptopReport.keyboard} · ${toSimpleEnglish(laptopReport.trackpad).label}`],
                            ['Ports & Charging', `${laptopReport.usbPorts} · ${toSimpleEnglish(laptopReport.charging).label}`],
                            ['SSD & Memory', `${laptopReport.ramSpecification} · ${laptopReport.ssdOrHddCondition}`],
                            ['Firmware / MDM Lock', `${laptopReport.biosOrFirmwareLock} · ${laptopReport.activationOrManagementLock}`],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="p-2.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0]"
                            >
                              <span className="text-[#716B7B] block text-[11px]">{label}</span>
                              <span className="font-medium text-[#211B2B] mt-0.5 block">
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {[
                            {
                              label: 'Battery Health',
                              value: `${activeGradeCard.batteryHealth}% (Original cell)`,
                              ok: activeGradeCard.batteryHealth >= 80,
                            },
                            {
                              label: 'Screen Originality',
                              value: activeGradeCard.screenOriginality,
                              ok: true,
                            },
                            {
                              label: 'Cameras (Front & Rear)',
                              value: phoneReport
                                ? `${toSimpleEnglish(phoneReport.frontCamera).label} / ${toSimpleEnglish(phoneReport.rearCamera).label}`
                                : 'Working properly',
                              ok: true,
                            },
                            {
                              label: 'Charging Port',
                              value: phoneReport
                                ? toSimpleEnglish(phoneReport.chargingPort).label
                                : 'Fast charging tested',
                              ok: true,
                            },
                            {
                              label: 'iCloud / MDM Lock Status',
                              value: phoneReport
                                ? `${phoneReport.icloudOrGoogleLock} · ${phoneReport.mdmStatus}`
                                : 'Clean & Removed · No MDM',
                              ok: true,
                            },
                            {
                              label: 'Face ID / Biometrics',
                              value:
                                activeGradeCard.faceIdStatus === 'Not working'
                                  ? 'Not working (passcode only)'
                                  : 'Tested & Working',
                              ok: activeGradeCard.faceIdStatus !== 'Not working',
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="p-2.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-start justify-between gap-2"
                            >
                              <div>
                                <span className="text-[#716B7B] block text-[11px]">
                                  {item.label}
                                </span>
                                <span
                                  className={`font-medium mt-0.5 block ${
                                    item.ok ? 'text-[#211B2B]' : 'text-[#D9534F]'
                                  }`}
                                >
                                  {item.value}
                                </span>
                              </div>
                              {item.ok ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#238653] shrink-0 mt-0.5" />
                              ) : (
                                <AlertOctagon className="w-3.5 h-3.5 text-[#D9534F] shrink-0 mt-0.5" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* E. "Complete Your Setup" (Accessory Cross-Sell) */}
            <div className="bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#211B2B]">Complete Your Setup</h2>
                  <p className="text-xs text-[#716B7B] mt-0.5">
                    Same-vendor accessories packed inside the same insured shipment from {listing.sellerName}.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {/* Included Free Gift Card */}
                <div className="p-3.5 rounded-xl border border-[#238653]/30 bg-[#238653]/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <SmartImage
                      src={setupAccessories.freeGiftItem.image}
                      alt={setupAccessories.freeGiftItem.name}
                      category="accessories"
                      className="w-12 h-12 rounded-xl object-cover border border-[#EAE6F0] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-[#211B2B]">
                          {setupAccessories.freeGiftItem.name}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#238653] text-white text-[10px] font-semibold tracking-wide">
                          <Gift className="w-3 h-3" />
                          FREE GIFT
                        </span>
                      </div>
                      <p className="text-[11px] text-[#716B7B] mt-0.5 line-clamp-1">
                        {setupAccessories.freeGiftItem.description}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-[#238653] shrink-0">
                    Included
                  </span>
                </div>

                {/* Paid Add-On Accessory Cards */}
                {setupAccessories.paidItems.map((acc) => {
                  const isAdded = selectedAccessories.some((a) => a.id === acc.id);
                  return (
                    <div
                      key={acc.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isAdded
                          ? 'border-2 border-[#A981FF] bg-[#F5F0FF]/35'
                          : 'border-[#EAE6F0] bg-[#FAF9FC]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <SmartImage
                          src={acc.image}
                          alt={acc.name}
                          category="accessories"
                          className="w-12 h-12 rounded-xl object-cover border border-[#EAE6F0] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#211B2B]">
                            {acc.name}
                          </div>
                          <div className="text-xs font-medium text-[#716B7B] tabular-nums mt-0.5">
                            {formatNaira(acc.price)}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleAccessory(acc)}
                        aria-pressed={isAdded}
                        className={`px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors shrink-0 min-h-[38px] ${
                          isAdded
                            ? 'bg-[#A981FF] text-white'
                            : 'bg-white border border-[#EAE6F0] hover:border-[#A981FF] text-[#211B2B]'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 text-[#A981FF]" />
                            Add
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Payment Hold & Vendor Trust Card */}
              <div className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs space-y-2.5">
                <div className="flex items-start gap-3">
                  <TrustTileIcon variant="escrow" size="sm" />
                  <div className="space-y-1">
                    <div className="font-semibold text-[#211B2B]">
                      Protected by {inspectionHours}-Hour Post-Delivery Inspection
                    </div>
                    <p className="text-[#4A4356] leading-relaxed">
                      Payment is held safely until physical delivery plus {inspectionHours} hours to test your device.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#EAE6F0]">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={onOpenBuyerProtection}
                      className="text-[#A981FF] font-medium hover:underline"
                    >
                      Payment Protection
                    </button>
                    <button
                      type="button"
                      onClick={onOpenHowItWorks}
                      className="text-[#4A4356] font-medium hover:underline"
                    >
                      How It Works
                    </button>
                    {onOpenInspectionEducationModal && (
                      <button
                        type="button"
                        onClick={onOpenInspectionEducationModal}
                        className="text-[#4A4356] font-medium hover:underline"
                      >
                        10-Point Checklist
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={activeGradeCard.stock <= 0}
                    onClick={() =>
                      onBuyNow(configuredListingForCart, selectedAccessories, configuredVariation)
                    }
                    className="text-xs font-semibold text-[#A981FF] hover:text-[#B796FE] disabled:opacity-40"
                  >
                    Express Checkout →
                  </button>
                </div>
              </div>

              {/* Vendor Storefront Row */}
              <div className="pt-2 border-t border-[#EAE6F0] flex items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-semibold text-[#211B2B] flex flex-wrap items-center gap-1.5">
                    <Store className="w-4 h-4 text-[#A981FF]" />
                    <span>{listing.sellerName}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F5F0FF] text-[#4A4356] text-[11px] font-medium">
                      {getShortStateLabel(getListingVendorState(listing))}
                    </span>
                  </div>
                  <div className="text-[#716B7B] mt-0.5">
                    {listing.sellerRating} ★ · {listing.sellerSalesCount} completed sales
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onViewVendorStorefront(listing.sellerId)}
                  className="px-3 py-2 rounded-xl border border-[#EAE6F0] hover:border-[#A981FF] font-medium text-[#211B2B] min-h-[38px]"
                >
                  Visit Storefront
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Overview & Verified Buyer Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3 text-xs">
            <h2 className="text-base font-medium text-[#211B2B]">
              Device Overview & Included Items
            </h2>
            {listing.structuredDescription && (
              <div className="space-y-2.5">
                <div>
                  <span className="font-semibold text-[#211B2B] block">Overview</span>
                  <p className="text-[#4A4356] mt-0.5 leading-relaxed">
                    {sanitizeConditionText(listing.structuredDescription.overview)}
                  </p>
                </div>
                {listing.structuredDescription.specsSummary && (
                  <div>
                    <span className="font-semibold text-[#211B2B] block">Specifications</span>
                    <p className="text-[#4A4356] mt-0.5">
                      {isFlagshipSeries
                        ? `${activeFlagshipModel.screenSize}, ${activeFlagshipModel.chipset}, ${activeStorage} storage, Unlocked.`
                        : listing.structuredDescription.specsSummary}
                    </p>
                  </div>
                )}
                {listing.structuredDescription.includedItems && (
                  <div>
                    <span className="font-semibold text-[#211B2B] block">Included Items</span>
                    <p className="text-[#4A4356] mt-0.5">
                      {listing.structuredDescription.includedItems}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EAE6F0] p-5 space-y-3">
            <h2 className="text-base font-medium text-[#211B2B] flex items-center gap-1.5">
              <Star className="w-4 h-4 text-[#A981FF]" />
              Verified Buyer Reviews ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <p className="text-xs text-[#716B7B]">
                No reviews for this exact unit yet. Covered by {inspectionHours}-hour inspection.
              </p>
            ) : (
              <div className="space-y-2.5">
                {reviews.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs space-y-1"
                  >
                    <div className="flex justify-between font-semibold text-[#211B2B]">
                      <span>{r.buyerName}</span>
                      <span>{r.rating}.0 ★</span>
                    </div>
                    <p className="text-[#4A4356] leading-relaxed">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* F. Sticky Bottom Action Bar */}
      <div
        data-testid="sticky-bottom-action-bar"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EAE6F0] shadow-[0_-4px_20px_rgba(33,27,43,0.06)]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-2.5 sm:gap-4">
          <div className="hidden md:flex flex-col min-w-0">
            <span className="text-xs font-semibold text-[#211B2B] truncate">
              {activeTitle} · {activeColorOption.name} · {activeGradeCard.grade}
            </span>
            <span className="text-[11px] text-[#716B7B]">
              {selectedAccessories.length > 0
                ? `Includes +${selectedAccessories.length} add-on + Free Tempered Glass`
                : 'Includes Free Tempered Glass Screen Protector'}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 w-full md:w-auto flex-1 md:flex-initial justify-end min-w-0">
            <button
              type="button"
              onClick={() => onMessageSeller(configuredListingForCart)}
              className="px-2.5 sm:px-3.5 py-3 rounded-xl border border-[#EAE6F0] bg-[#FAF9FC] hover:border-[#A981FF] text-xs font-medium text-[#211B2B] inline-flex items-center justify-center gap-1.5 shrink-0 min-h-[46px] whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4 text-[#A981FF] shrink-0" />
              <span className="hidden sm:inline">Chat with Vendor</span>
              <span className="sm:hidden">Chat</span>
            </button>

            <button
              type="button"
              disabled={activeGradeCard.stock <= 0}
              onClick={handleAddToCartAction}
              data-testid="sticky-add-to-cart"
              className="flex-1 min-w-0 md:min-w-[210px] bg-[#A981FF] hover:bg-[#B796FE] disabled:opacity-50 text-white font-medium py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors min-h-[46px] tabular-nums whitespace-nowrap"
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {activeGradeCard.stock <= 0
                  ? 'Sold Out'
                  : isEditingThisCartItem
                  ? justAddedToast
                    ? 'Cart Updated'
                    : `Save Cart Changes — ${formatNaira(liveTotalPrice)}`
                  : justAddedToast
                  ? `Added — ${formatNaira(liveTotalPrice)}`
                  : `Add to Cart — ${formatNaira(liveTotalPrice)}`}
              </span>
            </button>

            <button
              type="button"
              disabled={activeGradeCard.stock <= 0}
              onClick={() =>
                onBuyNow(configuredListingForCart, selectedAccessories, configuredVariation)
              }
              data-testid="sticky-buy-now"
              className="px-3 sm:px-4 py-3 rounded-xl border-2 border-[#A981FF] bg-[#F5F0FF] hover:bg-[#D0BCFC]/40 disabled:opacity-40 text-[#30102F] font-semibold text-xs sm:text-sm inline-flex items-center justify-center shrink-0 min-h-[46px] whitespace-nowrap"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {isZoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged product image preview"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            aria-label="Close image preview"
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white text-[#211B2B] min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          <SmartImage
            src={galleryImages[safeImageIndex]}
            alt={activeTitle}
            category={listing.category}
            className="max-w-3xl max-h-[85vh] rounded-2xl object-contain bg-white"
          />
        </div>
      )}
    </div>
  );
};

export default ProductDetailsView;
