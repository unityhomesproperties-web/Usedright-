import {
  Category,
  CosmeticGrade,
  DeviceListing,
  PlatformConfig,
  ProductVariation,
  VendorStorefront,
} from '../types/marketplace';
import { PLAIN_ENGLISH_ISSUE_PRESETS, toSimpleEnglish } from './simpleEnglish';
import { validateVendorConditionClaims } from './deviceCondition';

export interface CentralModelTemplate {
  id: string;
  brand: string;
  model: string;
  category: Category;
  modelYear: number;
  screenSize: string;
  operatingSystem: string;
  storageOptions: string[];
  colorOptions: { name: string; hex: string }[];
  defaultImage: string;
  sampleImages: string[];
}

export const CENTRAL_PARENT_MODELS: CentralModelTemplate[] = [
  {
    id: 'tpl-ip13-promax',
    brand: 'Apple',
    model: 'iPhone 13 Pro Max',
    category: 'phones',
    modelYear: 2021,
    screenSize: '6.7-inch Super Retina XDR',
    operatingSystem: 'iOS 18',
    storageOptions: ['128GB', '256GB', '512GB', '1TB'],
    colorOptions: [
      { name: 'Sierra Blue', hex: '#698EB2' },
      { name: 'Graphite', hex: '#3B3B40' },
      { name: 'Silver', hex: '#E5E7EB' },
      { name: 'Gold', hex: '#E6CFA7' },
    ],
    defaultImage: '/assets/aistudio/IMG_2196_33cba3a2.jpeg',
    sampleImages: [
      '/assets/aistudio/IMG_2196_33cba3a2.jpeg',
      '/assets/images/iphone_15_front_screen_1794644013924.jpg',
      '/assets/images/iphone_15_white_titanium_1794643999465.jpg',
    ],
  },
  {
    id: 'tpl-ip14-promax',
    brand: 'Apple',
    model: 'iPhone 14 Pro Max',
    category: 'phones',
    modelYear: 2022,
    screenSize: '6.7-inch ProMotion OLED',
    operatingSystem: 'iOS 18',
    storageOptions: ['128GB', '256GB', '512GB', '1TB'],
    colorOptions: [
      { name: 'Deep Purple', hex: '#594A73' },
      { name: 'Space Black', hex: '#212226' },
      { name: 'Gold', hex: '#E2C99A' },
      { name: 'Silver', hex: '#EAECEF' },
    ],
    defaultImage: '/assets/aistudio/IMG_2197_e7dddc99.jpeg',
    sampleImages: [
      '/assets/aistudio/IMG_2197_e7dddc99.jpeg',
      '/assets/images/iphone_15_space_black_1794643997957.jpg',
      '/assets/images/iphone_15_front_screen_1794644013924.jpg',
    ],
  },
  {
    id: 'tpl-ip15-promax',
    brand: 'Apple',
    model: 'iPhone 15 Pro Max',
    category: 'phones',
    modelYear: 2023,
    screenSize: '6.7-inch Super Retina XDR',
    operatingSystem: 'iOS 18',
    storageOptions: ['256GB', '512GB', '1TB'],
    colorOptions: [
      { name: 'Natural Titanium', hex: '#9D978E' },
      { name: 'Space Black', hex: '#242529' },
      { name: 'White Titanium', hex: '#F3F2EE' },
      { name: 'Desert Titanium', hex: '#B9987B' },
    ],
    defaultImage: '/assets/images/iphone_15_natural_titanium_1794643998199.jpg',
    sampleImages: [
      '/assets/images/iphone_15_natural_titanium_1794643998199.jpg',
      '/assets/images/iphone_15_space_black_1794643997957.jpg',
      '/assets/images/iphone_15_front_screen_1794644013924.jpg',
    ],
  },
  {
    id: 'tpl-ip16-256',
    brand: 'Apple',
    model: 'iPhone 16 - 256GB',
    category: 'phones',
    modelYear: 2024,
    screenSize: '6.1-inch Super Retina XDR',
    operatingSystem: 'iOS 18',
    storageOptions: ['128GB', '256GB', '512GB'],
    colorOptions: [
      { name: 'Black', hex: '#232428' },
      { name: 'Ultramarine', hex: '#4B63D1' },
      { name: 'Teal', hex: '#4D908E' },
      { name: 'White', hex: '#F4F4F5' },
      { name: 'Pink', hex: '#E89AB2' },
    ],
    defaultImage: '/assets/images/iphone_15_space_black_1794643997957.jpg',
    sampleImages: [
      '/assets/images/iphone_15_space_black_1794643997957.jpg',
      '/assets/images/iphone_15_white_titanium_1794643999465.jpg',
      '/assets/images/iphone_15_front_screen_1794644013924.jpg',
    ],
  },
  {
    id: 'tpl-s24-ultra',
    brand: 'Samsung',
    model: 'Galaxy S24 Ultra',
    category: 'phones',
    modelYear: 2024,
    screenSize: '6.8-inch QHD+ AMOLED',
    operatingSystem: 'Android 14',
    storageOptions: ['256GB', '512GB', '1TB'],
    colorOptions: [
      { name: 'Titanium Gray', hex: '#717378' },
      { name: 'Titanium Black', hex: '#232428' },
      { name: 'Titanium Violet', hex: '#63537D' },
    ],
    defaultImage: '/assets/aistudio/IMG_2198_1d596984.jpeg',
    sampleImages: [
      '/assets/aistudio/IMG_2198_1d596984.jpeg',
    ],
  },
  {
    id: 'tpl-mbp-14-m1',
    brand: 'Apple',
    model: 'MacBook Pro 14 M1 Pro',
    category: 'laptops',
    modelYear: 2021,
    screenSize: '14.2-inch Liquid Retina XDR',
    operatingSystem: 'macOS Sequoia',
    storageOptions: ['512GB SSD', '1TB SSD', '2TB SSD'],
    colorOptions: [
      { name: 'Space Gray', hex: '#5D6068' },
      { name: 'Silver', hex: '#D8DCE3' },
    ],
    defaultImage: '/assets/aistudio/IMG_2200_187e1578.jpeg',
    sampleImages: [
      '/assets/aistudio/IMG_2200_187e1578.jpeg',
    ],
  },
  {
    id: 'tpl-ipad-pro-m2',
    brand: 'Apple',
    model: 'iPad Pro 11 M2',
    category: 'tablets',
    modelYear: 2022,
    screenSize: '11-inch Liquid Retina',
    operatingSystem: 'iPadOS 18',
    storageOptions: ['128GB', '256GB', '512GB'],
    colorOptions: [
      { name: 'Space Gray', hex: '#595C63' },
      { name: 'Silver', hex: '#E4E7EC' },
    ],
    defaultImage: '/assets/aistudio/IMG_2199_e785383f.jpeg',
    sampleImages: [
      '/assets/aistudio/IMG_2199_e785383f.jpeg',
    ],
  },
];

export interface BulkDeviceUnitDraft {
  id: string;
  storage: string;
  color: string;
  grade: CosmeticGrade;
  batteryHealth: number;
  screenStatus: 'Original, verified' | 'Replaced OEM' | 'Replaced Aftermarket' | 'Minor Dead Pixels';
  biometricStatus: 'Working' | 'Not working' | 'Not applicable';
  cameraStatus: 'Working' | 'Faulty' | 'Not working';
  simStatus: string;
  disclosedFaults: string[];
  customFaultNote: string;
  price: number;
  stockQuantity: number;
  imeiOrSerial: string;
  photos: {
    front?: string;
    back?: string;
    sides?: string;
    defect?: string;
  };
}

export interface GroupedParentDraft {
  category: Category;
  brand: string;
  model: string;
  modelYear: number;
  yearMade: number;
  sourceCountry: string;
  batchReference: string;
  overview: string;
  warrantyDays: number;
}

export function createEmptyUnitDraft(template?: CentralModelTemplate, index: number = 0): BulkDeviceUnitDraft {
  return {
    id: `unit-${Date.now()}-${index}`,
    storage: template?.storageOptions[0] || '128GB',
    color: template?.colorOptions[0]?.name || 'Space Black',
    grade: 'Grade A',
    batteryHealth: 90,
    screenStatus: 'Original, verified',
    biometricStatus: template?.category === 'laptops' ? 'Working' : 'Working',
    cameraStatus: 'Working',
    simStatus: template?.category === 'laptops' ? 'Wi-Fi / Clean' : 'Unlocked (Physical + eSIM)',
    disclosedFaults: [],
    customFaultNote: '',
    price: template?.category === 'laptops' ? 880000 : 420000,
    stockQuantity: 1,
    imeiOrSerial: '',
    photos: {
      front: template?.defaultImage || '/assets/aistudio/IMG_2196_33cba3a2.jpeg',
    },
  };
}

export function validateBulkUnitMatrix(
  parent: GroupedParentDraft,
  units: BulkDeviceUnitDraft[],
  platformConfig?: PlatformConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!parent.brand.trim() || !parent.model.trim()) {
    errors.push('Select or enter both Brand and Parent Model.');
  }
  if (!parent.batchReference.trim()) {
    errors.push('Import batch reference is required for foreign-use verification.');
  }
  if (platformConfig && platformConfig.categories.every((c) => c.id !== parent.category || !c.enabled)) {
    errors.push('Selected product category is currently disabled.');
  }
  if (units.length === 0) {
    errors.push('Add at least one physical device unit to publish.');
  }

  const seenImeis = new Set<string>();
  units.forEach((u, idx) => {
    const label = `Device #${idx + 1}`;
    if (!u.imeiOrSerial.trim()) {
      errors.push(`${label}: IMEI or Serial Number is required.`);
    } else {
      const normalized = u.imeiOrSerial.trim().toUpperCase();
      if (seenImeis.has(normalized)) {
        errors.push(`${label}: Duplicate IMEI/Serial (${normalized}) inside the same upload batch.`);
      }
      seenImeis.add(normalized);
    }
    if (!u.price || u.price <= 0) {
      errors.push(`${label}: Valid price in Naira (₦) is required.`);
    }
    if (u.batteryHealth < 40 || u.batteryHealth > 100) {
      errors.push(`${label}: Battery health must be between 40% and 100%.`);
    }
    const unitImages = [u.photos.front, u.photos.back, u.photos.sides, u.photos.defect].filter(Boolean);
    if (unitImages.length === 0) {
      errors.push(`${label}: Attach at least one actual device photograph.`);
    }

    const claimCheck = validateVendorConditionClaims({
      listing: {
        category: parent.category,
        cosmeticGrade: u.grade,
        simStatus: u.simStatus,
        disclosedFaults: [...u.disclosedFaults, ...(u.customFaultNote ? [u.customFaultNote] : [])],
        faceIdStatus: u.biometricStatus === 'Working' ? 'Working' : 'Faulty',
        repairHistory: [],
        conditionReport: {
          batteryHealth: u.batteryHealth,
          batteryReplaced: 'Original',
          screenOriginality: u.screenStatus,
          screenReplacementHistory: u.screenStatus,
          faceIdOrFingerprint: u.biometricStatus === 'Working' ? 'Working' : 'Not working',
          frontCamera: u.cameraStatus,
          rearCamera: u.cameraStatus,
          speakers: 'Working',
          microphone: 'Working',
          chargingPort: 'Working',
          wifi: 'Working',
          bluetooth: 'Working',
          simFunctionality: u.simStatus.toLowerCase().includes('not working') ? 'Not working' : 'Working',
          networkLockStatus: /\blocked\b/i.test(u.simStatus) ? 'Carrier Locked' : 'Unlocked',
          icloudOrGoogleLock: 'Clean & Removed',
          mdmStatus: 'No MDM / Clean',
          imeiVerificationStatus: 'Verified Clean',
          otherRepairsNotes: '',
        },
      } as unknown as DeviceListing,
      descriptionText: `${parent.overview || ''} ${u.customFaultNote || ''}`,
    });
    if (!claimCheck.valid) {
      claimCheck.errors.forEach((err) => errors.push(`${label}: ${err}`));
    }
  });

  return { valid: errors.length === 0, errors };
}

export function buildGroupedListingFromBulkUnits(
  parent: GroupedParentDraft,
  units: BulkDeviceUnitDraft[],
  vendor: VendorStorefront,
  template?: CentralModelTemplate
): DeviceListing {
  const sortedByPrice = [...units].sort((a, b) => a.price - b.price);
  const leadUnit = sortedByPrice[0];
  const allImages: string[] = [];
  units.forEach((u) => {
    [u.photos.front, u.photos.back, u.photos.sides, u.photos.defect].forEach((img) => {
      if (img && !allImages.includes(img)) allImages.push(img);
    });
  });

  const mergedFaults = Array.from(
    new Set(
      units.flatMap((u) => [
        ...u.disclosedFaults,
        ...(u.customFaultNote.trim() ? [u.customFaultNote.trim()] : []),
      ])
    )
  );

  const variations: ProductVariation[] = units.map((u, idx) => {
    const unitPhotos = [u.photos.front, u.photos.back, u.photos.sides, u.photos.defect].filter(
      (x): x is string => Boolean(x)
    );
    const unitFaults = [
      ...u.disclosedFaults,
      ...(u.customFaultNote.trim() ? [u.customFaultNote.trim()] : []),
    ];

    return {
      id: `var-bulk-${Date.now()}-${idx}`,
      unitLabel: `Unit #${idx + 1}`,
      color: u.color,
      storage: u.storage,
      grade: u.grade,
      cosmeticGrade: u.grade,
      price: u.price,
      stockQuantity: Math.max(1, u.stockQuantity),
      isAvailable: u.stockQuantity > 0,
      batteryHealth: u.batteryHealth,
      simStatus: u.simStatus,
      images: unitPhotos.length > 0 ? unitPhotos : allImages,
      disclosedFaults: unitFaults,
      disclosedFaultsList: unitFaults.map((f, fIdx) => ({
        id: `vf-${Date.now()}-${idx}-${fIdx}`,
        label: toSimpleEnglish(f).label,
        description:
          PLAIN_ENGLISH_ISSUE_PRESETS.find((p) => p.label === f)?.description ||
          toSimpleEnglish(f).explanation,
        isCritical: true,
      })),
      conditionSummary: `${u.grade} · Battery ${u.batteryHealth}% · Screen: ${u.screenStatus} · Biometrics: ${u.biometricStatus} · Cameras: ${u.cameraStatus}`,
    };
  });

  const colorSwatchNames = Array.from(new Set(units.map((u) => u.color)));
  const colorSwatches = colorSwatchNames.map((name) => {
    const matchTemplate = template?.colorOptions.find((c) => c.name === name);
    const matchUnit = units.find((u) => u.color === name);
    return {
      name,
      hex: matchTemplate?.hex || '#211B2B',
      image: matchUnit?.photos.front || allImages[0],
    };
  });

  const totalStock = variations.reduce((sum, v) => sum + v.stockQuantity, 0);

  return {
    id: `dev-grp-${Date.now()}`,
    category: parent.category,
    condition: 'Foreign-Used',
    title: `${parent.brand} ${parent.model} (${leadUnit.storage})`,
    brand: parent.brand.trim(),
    model: parent.model.trim(),
    modelYear: parent.modelYear,
    yearMade: parent.yearMade,
    yearMadePrecision: 'known',
    operatingSystem: template?.operatingSystem,
    storage: leadUnit.storage,
    color: leadUnit.color,
    price: leadUnit.price,
    priceHasStartingPrefix: units.length > 1,
    cosmeticGrade: leadUnit.grade,
    cosmeticDescription:
      parent.overview.trim() ||
      `Verified pre-owned ${parent.brand} ${parent.model} (${units.length} checked unit${
        units.length > 1 ? 's' : ''
      } in batch ${parent.batchReference}).`,
    batteryHealth: leadUnit.batteryHealth,
    images: allImages.length > 0 ? allImages : ['/assets/aistudio/IMG_2196_33cba3a2.jpeg'],
    colorSwatches,
    sellerId: vendor.id,
    sellerName: vendor.name,
    sellerState: vendor.state || 'Lagos State',
    sellerVerified: vendor.verificationBadge,
    sellerRating: vendor.rating,
    sellerSalesCount: vendor.completedOrders,
    foreignUsedStatus: 'Verified Foreign-Used',
    originEvidenceReviewed: true,
    usedRightInspected: false,
    sourceCountry: parent.sourceCountry,
    batchReference: parent.batchReference.trim(),
    simStatus: leadUnit.simStatus,
    faceIdStatus: leadUnit.biometricStatus === 'Working' ? 'Working' : 'Faulty',
    screenSize: template?.screenSize,
    imeiOrSerial: units.map((u) => u.imeiOrSerial.trim()).join(', '),
    disclosedFaults: mergedFaults,
    disclosedFaultsList: mergedFaults.map((label, idx) => ({
      id: `flt-${Date.now()}-${idx}`,
      label: toSimpleEnglish(label).label,
      description:
        PLAIN_ENGLISH_ISSUE_PRESETS.find((p) => p.label === label)?.description ||
        toSimpleEnglish(label).explanation,
      isCritical: true,
    })),
    structuredDescription: {
      overview:
        parent.overview.trim() ||
        `Grouped batch of ${units.length} pre-owned ${parent.brand} ${parent.model} unit(s), each individually graded and tested.`,
      specsSummary: `${template?.screenSize || ''} · Storage from ${leadUnit.storage}`,
      includedItems: 'Device (tested and wiped clean) + protective transit pouch',
      previousRepairs: units.some((u) => u.screenStatus !== 'Original, verified')
        ? 'Screen replacement disclosed per unit above.'
        : 'No previous internal repairs disclosed.',
      knownLimitations: mergedFaults.length > 0 ? mergedFaults.join('; ') : 'None disclosed.',
    },
    conditionReport: {
      batteryHealth: leadUnit.batteryHealth,
      batteryReplaced: 'Original',
      screenOriginality: leadUnit.screenStatus,
      screenReplacementHistory: leadUnit.screenStatus,
      faceIdOrFingerprint:
        leadUnit.biometricStatus === 'Working' ? 'Working' : 'Not working',
      frontCamera: leadUnit.cameraStatus,
      rearCamera: leadUnit.cameraStatus,
      speakers: 'Working',
      microphone: 'Working',
      chargingPort: 'Working',
      wifi: 'Working',
      bluetooth: 'Working',
      simFunctionality: leadUnit.simStatus.toLowerCase().includes('not working')
        ? 'Not working'
        : 'Working',
      networkLockStatus: /\blocked\b/i.test(leadUnit.simStatus)
        ? 'Carrier Locked'
        : 'Unlocked',
      icloudOrGoogleLock: 'Clean & Removed',
      mdmStatus: 'No MDM / Clean',
      imeiVerificationStatus: 'Verified Clean',
      otherRepairsNotes: `${units.length} unit(s) inspected under batch ${parent.batchReference}.`,
    },
    repairHistory: [],
    warrantyDays: parent.warrantyDays,
    warrantyPolicyNotes: vendor.warrantyPolicy,
    deliveryFee: 5000,
    freeDeliveryEligible: leadUnit.price >= 500000,
    status: 'Active',
    displayOrder: 0,
    createdAt: new Date().toISOString().slice(0, 10),
    views: 1,
    variations,
    stockQuantity: totalStock,
    totalStock,
  };
}

/**
 * Reorders a vendor's listing sequence and updates explicit displayOrder indices across all listings.
 */
export function reorderVendorListingSequence(
  allListings: DeviceListing[],
  vendorId: string,
  sourceId: string,
  targetId: string
): DeviceListing[] {
  if (sourceId === targetId) return allListings;
  const vendorItems = allListings
    .filter((l) => l.sellerId === vendorId)
    .sort(
      (a, b) =>
        (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999) ||
        b.sellerRating * 100 - a.sellerRating * 100 ||
        (b.views || 0) - (a.views || 0)
    );

  const fromIdx = vendorItems.findIndex((l) => l.id === sourceId);
  const toIdx = vendorItems.findIndex((l) => l.id === targetId);
  if (fromIdx === -1 || toIdx === -1) return allListings;

  const reordered = [...vendorItems];
  const [moved] = reordered.splice(fromIdx, 1);
  reordered.splice(toIdx, 0, moved);

  const rankMap = new Map<string, number>();
  reordered.forEach((item, idx) => rankMap.set(item.id, idx + 1));

  return allListings.map((l) =>
    rankMap.has(l.id) ? { ...l, displayOrder: rankMap.get(l.id)! } : l
  );
}
