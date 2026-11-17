import { DeviceListing, VendorStorefront } from '../types/marketplace';

export interface NigerianStateHub {
  value: string;
  label: string;
  shortLabel: string;
  hubArea: string;
}

export const NIGERIAN_COMMERCIAL_HUBS: NigerianStateHub[] = [
  {
    value: 'Lagos State',
    label: 'Lagos State (Computer Village / Ikeja / Lekki)',
    shortLabel: 'Lagos',
    hubArea: 'Computer Village / Ikeja / Lekki',
  },
  {
    value: 'Abuja (FCT)',
    label: 'Abuja (FCT)',
    shortLabel: 'Abuja',
    hubArea: 'CBD / Garki / Wuse',
  },
  {
    value: 'Rivers State',
    label: 'Rivers State (Port Harcourt)',
    shortLabel: 'Rivers',
    hubArea: 'Port Harcourt / GRA',
  },
  {
    value: 'Oyo State',
    label: 'Oyo State (Ibadan)',
    shortLabel: 'Oyo',
    hubArea: 'Ibadan / Ring Road',
  },
  {
    value: 'Kano State',
    label: 'Kano State',
    shortLabel: 'Kano',
    hubArea: 'Kano Metropolis',
  },
  {
    value: 'Ogun State',
    label: 'Ogun State',
    shortLabel: 'Ogun',
    hubArea: 'Abeokuta / Sango-Ota',
  },
  {
    value: 'Edo State',
    label: 'Edo State',
    shortLabel: 'Edo',
    hubArea: 'Benin City',
  },
  {
    value: 'Delta State',
    label: 'Delta State',
    shortLabel: 'Delta',
    hubArea: 'Warri / Asaba',
  },
  {
    value: 'Enugu State',
    label: 'Enugu State',
    shortLabel: 'Enugu',
    hubArea: 'Enugu Urban',
  },
  {
    value: 'Kaduna State',
    label: 'Kaduna State',
    shortLabel: 'Kaduna',
    hubArea: 'Kaduna North / Barnawa',
  },
];

const KNOWN_VENDOR_DEFAULT_STATES: Record<string, string> = {
  'vendor-1': 'Lagos State',
  'vendor-2': 'Abuja (FCT)',
  'vendor-3': 'Abuja (FCT)',
  'vendor-4': 'Lagos State',
  'vendor-techvault': 'Lagos State',
  'vendor-gadgethub': 'Lagos State',
  'vendor-swiftphones': 'Rivers State',
  'vendor-apex': 'Oyo State',
};

export function inferStateFromLocationText(location?: string): string {
  const lower = (location || '').toLowerCase();
  if (lower.includes('abuja') || lower.includes('fct') || lower.includes('garki') || lower.includes('wuse')) {
    return 'Abuja (FCT)';
  }
  if (lower.includes('rivers') || lower.includes('port harcourt') || lower.includes('phc')) {
    return 'Rivers State';
  }
  if (lower.includes('oyo') || lower.includes('ibadan')) {
    return 'Oyo State';
  }
  if (lower.includes('kano')) {
    return 'Kano State';
  }
  if (lower.includes('ogun') || lower.includes('abeokuta') || lower.includes('ota')) {
    return 'Ogun State';
  }
  if (lower.includes('edo') || lower.includes('benin')) {
    return 'Edo State';
  }
  if (lower.includes('delta') || lower.includes('warri') || lower.includes('asaba')) {
    return 'Delta State';
  }
  if (lower.includes('enugu')) {
    return 'Enugu State';
  }
  if (lower.includes('kaduna')) {
    return 'Kaduna State';
  }
  if (
    lower.includes('lagos') ||
    lower.includes('ikeja') ||
    lower.includes('lekki') ||
    lower.includes('victoria island') ||
    lower.includes('computer village')
  ) {
    return 'Lagos State';
  }
  return 'Lagos State';
}

export function normalizeNigerianState(input?: string): string {
  const raw = (input || '').trim();
  if (!raw || raw.toLowerCase() === 'all') return 'all';

  const exact = NIGERIAN_COMMERCIAL_HUBS.find(
    (h) =>
      h.value.toLowerCase() === raw.toLowerCase() ||
      h.shortLabel.toLowerCase() === raw.toLowerCase() ||
      h.label.toLowerCase() === raw.toLowerCase()
  );
  if (exact) return exact.value;

  return inferStateFromLocationText(raw);
}

export function getShortStateLabel(state?: string): string {
  if (!state || state === 'all') return 'All Nigeria';
  const normalized = normalizeNigerianState(state);
  const match = NIGERIAN_COMMERCIAL_HUBS.find((h) => h.value === normalized);
  if (match) return match.shortLabel;
  return state.replace(/\s+State$/i, '').replace(/\s*\(FCT\)$/i, '').trim() || 'Lagos';
}

export function getFullStateLabel(state?: string): string {
  if (!state || state === 'all') return 'All Nigeria';
  const normalized = normalizeNigerianState(state);
  const match = NIGERIAN_COMMERCIAL_HUBS.find((h) => h.value === normalized);
  return match ? match.label : state;
}

export function getListingVendorState(
  listing: Pick<DeviceListing, 'sellerId' | 'sellerState' | 'sellerName'>,
  vendors?: VendorStorefront[]
): string {
  if (vendors && vendors.length > 0) {
    const matchedVendor = vendors.find((v) => v.id === listing.sellerId);
    if (matchedVendor) {
      if (matchedVendor.state) return normalizeNigerianState(matchedVendor.state);
      if (matchedVendor.location) return inferStateFromLocationText(matchedVendor.location);
    }
  }
  if (listing.sellerState) {
    return normalizeNigerianState(listing.sellerState);
  }
  if (listing.sellerId && KNOWN_VENDOR_DEFAULT_STATES[listing.sellerId]) {
    return KNOWN_VENDOR_DEFAULT_STATES[listing.sellerId];
  }
  if (listing.sellerName) {
    const lowerName = listing.sellerName.toLowerCase();
    if (lowerName.includes('abuja') || lowerName.includes('silicon gate')) return 'Abuja (FCT)';
    if (lowerName.includes('swiftphones')) return 'Rivers State';
    if (lowerName.includes('apex laptops')) return 'Oyo State';
  }
  return 'Lagos State';
}

export function enrichListingsWithVendorState(
  listings: DeviceListing[],
  vendors: VendorStorefront[]
): DeviceListing[] {
  return listings.map((listing) => {
    const resolvedState = getListingVendorState(listing, vendors);
    if (listing.sellerState === resolvedState) return listing;
    return { ...listing, sellerState: resolvedState };
  });
}
