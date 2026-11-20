import {
  AccessoryItem,
  CosmeticGrade,
  DeviceListing,
  DisclosedFault,
  FunctionalTestStatus,
  PhoneConditionReport,
  ProductVariation,
} from '../types/marketplace';
import {
  buildConditionStatement,
  getEffectiveFunctionalStatus,
  hasFaceIdOrBiometricFault,
  hasReplacedScreen,
  qualifiesForWorksLikeNew,
} from './deviceCondition';

export type ConfiguratorGradeKey = 'Grade C' | 'Grade B' | 'Grade A';

export interface GradeOptionCard {
  grade: ConfiguratorGradeKey;
  title: string;
  badgeLabel: string;
  description: string;
  priceDelta: number;
  price: number;
  stock: number;
  batteryHealth: number;
  disclosedIssues: DisclosedFault[];
  screenOriginality: string;
  faceIdStatus: 'Working' | 'Not working';
  cosmeticNotes: string;
  worksLikeNewEligible: boolean;
  functionalStatus: FunctionalTestStatus;
}

export interface ColorOptionConfig {
  name: string;
  hex: string;
  images: string[];
  gradeStock: Record<ConfiguratorGradeKey, number>;
}

export interface ModelConfigOption {
  id: 'iphone-15-pro-128' | 'iphone-15-pro-max-256';
  shortLabel: string;
  title: string;
  storage: string;
  screenSize: string;
  chipset: string;
  baseGradeCPrice: number;
  retailReferencePrice: number;
  rating: number;
  reviewCount: number;
  colors: ColorOptionConfig[];
}

export interface PriceHistoryPoint {
  month: string;
  label: string;
  usedRightPrice: number;
  retailPrice: number;
}

export interface ComparisonDeviceCandidate {
  id: string;
  title: string;
  storage: string;
  grade: string;
  price: number;
  batteryHealth: string;
  screenOriginality: string;
  biometricsAndIssues: string;
  simStatus: string;
  warrantyDays: number;
  image?: string;
}

export interface ComparisonSpecRow {
  label: string;
  values: string[];
}

export const GRADE_OFFSETS: Record<ConfiguratorGradeKey, number> = {
  'Grade C': 0,
  'Grade B': 45000,
  'Grade A': 90000,
};

export const GRADE_COPY: Record<
  ConfiguratorGradeKey,
  { title: string; badgeLabel: string; description: string; appearanceDescription: string }
> = {
  'Grade C': {
    title: 'Good (Grade C)',
    badgeLabel: 'Good',
    description: 'Visible scratches, dents or signs of use. Works like new.',
    appearanceDescription:
      'Visible scratches, dents or signs of use. May show noticeable cosmetic marks while passing functionality checks.',
  },
  'Grade B': {
    title: 'Very Good (Grade B)',
    badgeLabel: 'Very Good',
    description: 'Minor scratches or cosmetic marks. Works like new.',
    appearanceDescription:
      'Minor scratches or cosmetic marks. Small signs of previous use while maintaining a clean appearance.',
  },
  'Grade A': {
    title: 'Excellent (Grade A)',
    badgeLabel: 'Excellent',
    description: 'Nearly flawless appearance. Works like new.',
    appearanceDescription:
      'Nearly flawless appearance. Very little visible cosmetic wear.',
  },
};

export const COLOR_SWATCH_MAP: Record<string, string> = {
  'space black': '#1F1F23',
  'natural titanium': '#9E9A93',
  'white titanium': '#F2F1EE',
  'desert titanium': '#C8A984',
  'blue': '#3B6E9C',
  'sierra blue': '#7FA4C4',
  'black': '#1D1D1F',
  'graphite': '#4A4A4F',
  'white': '#F4F4F5',
  'pacific blue': '#2F4D5C',
  'space gray': '#585B60',
  'silver': '#D4D6D9',
  'midnight': '#232732',
  'obsidian black': '#1E2024',
  'phantom black': '#1B1B1E',
  'ultramarine': '#4166F5',
  'teal': '#2B8A88',
  'pink': '#F4A6C1',
  'starlight': '#F4EFEA',
};

export function resolveColorHex(colorName: string): string {
  const key = colorName.trim().toLowerCase();
  if (COLOR_SWATCH_MAP[key]) return COLOR_SWATCH_MAP[key];
  if (key.includes('black') || key.includes('dark') || key.includes('graphite')) return '#222226';
  if (key.includes('white') || key.includes('silver') || key.includes('pearl')) return '#F2F2F4';
  if (key.includes('blue')) return '#3B6E9C';
  if (key.includes('gold') || key.includes('desert') || key.includes('bronze')) return '#C8A984';
  if (key.includes('titanium') || key.includes('gray') || key.includes('grey')) return '#8F8C86';
  if (key.includes('green')) return '#4B6B5A';
  if (key.includes('purple')) return '#A981FF';
  return '#716B7B';
}

export function getGradePrice(baseGradeCPrice: number, grade: ConfiguratorGradeKey): number {
  return baseGradeCPrice + GRADE_OFFSETS[grade];
}

export function buildFlagshipGradeOptions(
  model: ModelConfigOption,
  selectedColor: ColorOptionConfig
): GradeOptionCard[] {
  const isProMax = model.id === 'iphone-15-pro-max-256';
  const gradeCIssues: DisclosedFault[] = isProMax
    ? [
        {
          label: 'Face ID not working — passcode unlock only',
          description:
            'TrueDepth sensor has been disabled after glass alignment; 6-digit passcode and Apple Pay PIN unlock work reliably.',
          isCritical: true,
        },
        {
          label: 'Battery health at 82%, charges normally',
          description:
            'Original factory battery holds solid full-day standby and charges via 20W USB-C without overheating.',
          isCritical: false,
        },
      ]
    : [
        {
          label: 'Battery health at 82%, charges normally',
          description:
            'Original cell at 82% peak capacity; tested for fast USB-C and MagSafe charging with zero sudden shutdowns.',
          isCritical: false,
        },
        {
          label: 'Visible light frame marks near charging port',
          description:
            'Two shallow scuffs on lower titanium frame from previous case removal; screen glass is intact.',
          isCritical: false,
        },
      ];

  const gradeBIssues: DisclosedFault[] = [
    {
      label: 'Minor cosmetic marks on titanium rail',
      description:
        'Faint hairline wear around camera ring or side frame visible under direct light; all cameras, Face ID, and display tested 100% working.',
      isCritical: false,
    },
  ];

  return [
    {
      grade: 'Grade C',
      title: GRADE_COPY['Grade C'].title,
      badgeLabel: GRADE_COPY['Grade C'].badgeLabel,
      description: isProMax
        ? 'Visible scratches, dents or signs of use. Other tested functions work as expected. Face ID is not working.'
        : GRADE_COPY['Grade C'].description,
      priceDelta: GRADE_OFFSETS['Grade C'],
      price: getGradePrice(model.baseGradeCPrice, 'Grade C'),
      stock: selectedColor.gradeStock['Grade C'],
      batteryHealth: 82,
      disclosedIssues: gradeCIssues,
      screenOriginality: 'Original, verified',
      faceIdStatus: isProMax ? 'Not working' : 'Working',
      cosmeticNotes: 'Visible scratches on titanium edges and back matte glass; screen responds cleanly.',
      worksLikeNewEligible: !isProMax,
      functionalStatus: isProMax ? 'Functional With Disclosed Limitations' : 'Fully Functional',
    },
    {
      grade: 'Grade B',
      title: GRADE_COPY['Grade B'].title,
      badgeLabel: GRADE_COPY['Grade B'].badgeLabel,
      description: GRADE_COPY['Grade B'].description,
      priceDelta: GRADE_OFFSETS['Grade B'],
      price: getGradePrice(model.baseGradeCPrice, 'Grade B'),
      stock: selectedColor.gradeStock['Grade B'],
      batteryHealth: 89,
      disclosedIssues: gradeBIssues,
      screenOriginality: 'Original, verified',
      faceIdStatus: 'Working',
      cosmeticNotes: 'Light micro-marks only visible within 15cm; display and lenses spotless.',
      worksLikeNewEligible: true,
      functionalStatus: 'Fully Functional',
    },
    {
      grade: 'Grade A',
      title: GRADE_COPY['Grade A'].title,
      badgeLabel: GRADE_COPY['Grade A'].badgeLabel,
      description: GRADE_COPY['Grade A'].description,
      priceDelta: GRADE_OFFSETS['Grade A'],
      price: getGradePrice(model.baseGradeCPrice, 'Grade A'),
      stock: selectedColor.gradeStock['Grade A'],
      batteryHealth: 95,
      disclosedIssues: [],
      screenOriginality: 'Original, verified',
      faceIdStatus: 'Working',
      cosmeticNotes: 'Nearly indistinguishable from open-box retail unit; zero screen or lens wear.',
      worksLikeNewEligible: true,
      functionalStatus: 'Fully Functional',
    },
  ];
}

export function buildGenericGradeOptions(
  listing: DeviceListing,
  selectedColorName: string,
  variations: ProductVariation[]
): GradeOptionCard[] {
  const colorVars = variations.filter(
    (v) => v.color.toLowerCase() === selectedColorName.toLowerCase()
  );

  // Derive realistic base Grade C price from listing's current grade/price
  const basePrice =
    listing.cosmeticGrade === 'Grade C'
      ? listing.price
      : listing.cosmeticGrade === 'Grade B'
      ? Math.max(50000, listing.price - GRADE_OFFSETS['Grade B'])
      : Math.max(50000, listing.price - GRADE_OFFSETS['Grade A']);

  const grades: ConfiguratorGradeKey[] = ['Grade C', 'Grade B', 'Grade A'];
  return grades.map((grade) => {
    const matchedVar = colorVars.find((v) => v.grade === grade);
    const matchesBaseListing =
      grade === listing.cosmeticGrade &&
      (selectedColorName.toLowerCase() === listing.color.toLowerCase() || colorVars.length === 0);

    const price = matchedVar?.price ?? getGradePrice(basePrice, grade);
    const stock = matchedVar
      ? matchedVar.isAvailable
        ? matchedVar.stockQuantity
        : 0
      : matchesBaseListing
      ? listing.stockQuantity ?? 1
      : grade === 'Grade A' && selectedColorName.toLowerCase().includes('white')
      ? 0
      : 1;

    const fallbackFaults: DisclosedFault[] =
      grade === 'Grade C'
        ? listing.disclosedFaultsList?.length
          ? listing.disclosedFaultsList
          : [
              {
                label: 'Visible cosmetic scratches or signs of use',
                description:
                  'Noticeable marks on outer chassis or frame; internal hardware checked separately.',
              },
            ]
        : grade === 'Grade B'
        ? [
            {
              label: 'Minor cosmetic marks on frame',
              description: 'Small surface signs of previous use while maintaining a clean appearance.',
            },
          ]
        : [];

    const varFaults: DisclosedFault[] =
      matchedVar?.disclosedFaults?.map((f) => ({
        label: f,
        description: matchedVar.conditionSummary || f,
      })) || [];

    const resolvedIssues =
      varFaults.length > 0
        ? varFaults
        : matchesBaseListing && listing.disclosedFaultsList?.length
        ? listing.disclosedFaultsList
        : fallbackFaults;

    const phoneReport = listing.conditionReport as PhoneConditionReport | undefined;
    const effectiveScreenOrig = matchedVar?.screenReplaced
      ? 'Screen replaced (tested)'
      : hasReplacedScreen(listing, matchedVar)
      ? 'Screen replaced (tested)'
      : phoneReport?.screenOriginality || 'Original, verified';

    const faceIdFault = hasFaceIdOrBiometricFault(
      listing,
      matchedVar,
      undefined,
      resolvedIssues.map((i) => i.label)
    );

    const qualInput = {
      listing,
      variation: matchedVar,
      gradeOverride: grade,
      screenOriginalityOverride: effectiveScreenOrig,
      faceIdOverride: (faceIdFault ? 'Not working' : 'Working') as 'Working' | 'Not working',
      disclosedLabelsOverride: resolvedIssues.map((i) => i.label),
    };

    const worksLikeNewEligible = qualifiesForWorksLikeNew(qualInput);
    const functionalStatus = getEffectiveFunctionalStatus(qualInput);
    const qualifiedDescription = buildConditionStatement(qualInput);

    return {
      grade,
      title: GRADE_COPY[grade].title,
      badgeLabel: GRADE_COPY[grade].badgeLabel,
      description: qualifiedDescription,
      priceDelta: GRADE_OFFSETS[grade],
      price,
      stock,
      batteryHealth:
        matchedVar?.batteryHealth ??
        (grade === 'Grade A'
          ? Math.max(listing.batteryHealth || 90, 91)
          : grade === 'Grade B'
          ? listing.batteryHealth || 86
          : Math.min(listing.batteryHealth || 82, 83)),
      disclosedIssues: resolvedIssues,
      screenOriginality: effectiveScreenOrig,
      faceIdStatus: faceIdFault ? 'Not working' : 'Working',
      cosmeticNotes:
        matchedVar?.conditionSummary ||
        listing.cosmeticDescription ||
        GRADE_COPY[grade].appearanceDescription,
      worksLikeNewEligible,
      functionalStatus,
    };
  });
}

export function calculateConfiguredTotal(
  devicePrice: number,
  selectedAccessories: AccessoryItem[]
): number {
  const paidAddons = selectedAccessories.reduce(
    (sum, acc) => sum + (acc.price > 0 ? acc.price : 0),
    0
  );
  return Math.max(0, devicePrice + paidAddons);
}

export function buildConfiguredVariation(params: {
  id: string;
  color: string;
  storage?: string;
  ram?: string;
  grade: CosmeticGrade;
  price: number;
  originalPrice?: number;
  stockQuantity: number;
  batteryHealth?: number;
  images?: string[];
  disclosedFaults?: string[];
  conditionSummary?: string;
  simStatus?: string;
}): ProductVariation {
  return {
    id: params.id,
    color: params.color,
    storage: params.storage,
    ram: params.ram,
    grade: params.grade,
    price: params.price,
    originalPrice: params.originalPrice,
    stockQuantity: params.stockQuantity,
    isAvailable: params.stockQuantity > 0,
    batteryHealth: params.batteryHealth,
    images: params.images,
    disclosedFaults: params.disclosedFaults,
    conditionSummary: params.conditionSummary,
    simStatus: params.simStatus,
  };
}

export function generatePriceHistorySeries(
  currentPrice: number,
  grade: ConfiguratorGradeKey,
  range: '3M' | '6M' = '6M'
): PriceHistoryPoint[] {
  const retailRef = Math.round((currentPrice * 1.28) / 5000) * 5000;
  // Realistic pre-owned Nigerian Naira depreciation & FX curve
  const allPoints: PriceHistoryPoint[] = [
    {
      month: 'Jun',
      label: 'Jun 2026',
      usedRightPrice: Math.round((currentPrice * 1.11) / 5000) * 5000,
      retailPrice: retailRef + 35000,
    },
    {
      month: 'Jul',
      label: 'Jul 2026',
      usedRightPrice: Math.round((currentPrice * 1.08) / 5000) * 5000,
      retailPrice: retailRef + 25000,
    },
    {
      month: 'Aug',
      label: 'Aug 2026',
      usedRightPrice: Math.round((currentPrice * 1.05) / 5000) * 5000,
      retailPrice: retailRef + 15000,
    },
    {
      month: 'Sep',
      label: 'Sep 2026',
      usedRightPrice: Math.round((currentPrice * 1.03) / 5000) * 5000,
      retailPrice: retailRef + 10000,
    },
    {
      month: 'Oct',
      label: 'Oct 2026',
      usedRightPrice:
        grade === 'Grade C'
          ? Math.round((currentPrice * 1.02) / 5000) * 5000
          : Math.round((currentPrice * 1.01) / 5000) * 5000,
      retailPrice: retailRef + 5000,
    },
    {
      month: 'Nov',
      label: 'Nov 2026 (Now)',
      usedRightPrice: currentPrice,
      retailPrice: retailRef,
    },
  ];

  return range === '3M' ? allPoints.slice(-3) : allPoints;
}

export function buildComparisonMatrix(
  currentDevice: ComparisonDeviceCandidate,
  selectedPeers: ComparisonDeviceCandidate[]
): {
  devices: ComparisonDeviceCandidate[];
  rows: ComparisonSpecRow[];
} {
  const devices = [currentDevice, ...selectedPeers];
  const formatPrice = (n: number) => `₦${n.toLocaleString('en-NG')}`;
  const rows: ComparisonSpecRow[] = [
    {
      label: 'Price (₦)',
      values: devices.map((d) => formatPrice(d.price)),
    },
    {
      label: 'Cosmetic Grade',
      values: devices.map((d) => d.grade),
    },
    {
      label: 'Storage Capacity',
      values: devices.map((d) => d.storage),
    },
    {
      label: 'Battery Health',
      values: devices.map((d) => d.batteryHealth),
    },
    {
      label: 'Screen Originality',
      values: devices.map((d) => d.screenOriginality),
    },
    {
      label: 'Biometrics & Disclosed Issues',
      values: devices.map((d) => d.biometricsAndIssues),
    },
    {
      label: 'SIM & Network Status',
      values: devices.map((d) => d.simStatus),
    },
    {
      label: 'Hardware Warranty',
      values: devices.map((d) => (d.warrantyDays > 0 ? `${d.warrantyDays} Days` : '24h Inspection')),
    },
  ];
  return { devices, rows };
}
